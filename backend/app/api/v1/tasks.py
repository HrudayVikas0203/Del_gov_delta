from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_min_role
from app.db.session import get_db
from app.models.delivery import AllocationRole, Project, ResourceAllocation
from app.models.people import Employee, Role
from app.models.tasks import Task, TaskAssignment, TaskComment, TaskStatus
from app.schemas.common import TaskApprovalAction, TaskCommentCreate, TaskCommentOut, TaskCreate, TaskOut, TaskReviewSubmit, TaskUpdate
from app.services.audit import audit

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _labels_to_text(labels: list[str] | None) -> str | None:
    if not labels:
        return None
    return ",".join(label.strip() for label in labels if label.strip())


def _hydrate_task(task: Task, db: Session) -> Task:
    project = db.get(Project, task.project_id)
    assignee = db.get(Employee, task.assignee_id) if task.assignee_id else None
    setattr(task, "labels", task.labels.split(",") if task.labels else [])
    setattr(task, "assignee_ids", [assignment.employee_id for assignment in task.assignments])
    setattr(task, "project_name", project.name if project else None)
    setattr(task, "assignee_name", assignee.name if assignee else None)
    return task


def _sync_assignments(task: Task, assignee_ids: list[str], db: Session) -> None:
    existing = {assignment.employee_id: assignment for assignment in task.assignments}
    requested = set(assignee_ids)
    for employee_id in requested:
        if not db.get(Employee, employee_id):
            raise HTTPException(status_code=404, detail=f"Assignee {employee_id} not found")
        if employee_id not in existing:
            db.add(TaskAssignment(task_id=task.id, employee_id=employee_id))
    for employee_id, assignment in existing.items():
        if employee_id not in requested:
            db.delete(assignment)


def _project_allocation(project_id: str, employee_id: str, db: Session) -> ResourceAllocation | None:
    return db.scalar(
        select(ResourceAllocation).where(
            ResourceAllocation.project_id == project_id,
            ResourceAllocation.employee_id == employee_id,
            ResourceAllocation.end_date.is_(None),
        )
    )


def _ensure_task_authority(project: Project, actor: Employee, db: Session) -> None:
    if actor.role in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER, Role.PROJECT_MANAGER}:
        if actor.role == Role.PROGRAM_MANAGER and project.program_manager_id not in {None, actor.id}:
            raise HTTPException(status_code=403, detail="Program managers can create tasks only inside their allocated program projects")
        if actor.role == Role.PROJECT_MANAGER and project.project_manager_id not in {None, actor.id}:
            raise HTTPException(status_code=403, detail="Project managers can create tasks only inside their own projects")
        return
    allocation = _project_allocation(project.id, actor.id, db)
    if allocation and allocation.allocation_role in {AllocationRole.ARCHITECT, AllocationRole.TEAM_LEAD}:
        return
    raise HTTPException(status_code=403, detail="Tasks can be created by project leadership or the allocated technical architect")


def _ensure_assignees_are_project_team(project_id: str, assignee_ids: list[str], db: Session) -> None:
    for assignee_id in assignee_ids:
        if not db.get(Employee, assignee_id):
            raise HTTPException(status_code=404, detail=f"Assignee {assignee_id} not found")
        if not _project_allocation(project_id, assignee_id, db):
            raise HTTPException(status_code=400, detail=f"Assignee {assignee_id} is not allocated to this project")


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: str | None = None,
    assignee_id: str | None = None,
    db: Session = Depends(get_db),
    _: Employee = Depends(get_current_user),
) -> list[Task]:
    stmt = select(Task).order_by(Task.updated_at.desc())
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if assignee_id:
        stmt = stmt.where(Task.assignee_id == assignee_id)
    return [_hydrate_task(task, db) for task in db.scalars(stmt).all()]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> Task:
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _ensure_task_authority(project, actor, db)
    assignee_ids = list(dict.fromkeys(([payload.assignee_id] if payload.assignee_id else []) + payload.assignee_ids))
    _ensure_assignees_are_project_team(payload.project_id, assignee_ids, db)

    task = Task(
        **payload.model_dump(exclude={"labels", "assignee_id", "assignee_ids"}),
        reporter_id=actor.id,
        assignee_id=payload.assignee_id or (assignee_ids[0] if assignee_ids else None),
        labels=_labels_to_text(payload.labels),
    )
    db.add(task)
    db.flush()
    _sync_assignments(task, assignee_ids, db)
    audit(db, actor.id, "Task Created", "Task Tracker", f"Task {task.title} created")
    db.commit()
    db.refresh(task)
    return _hydrate_task(task, db)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    data = payload.model_dump(exclude_unset=True)
    if "labels" in data:
        data["labels"] = _labels_to_text(data["labels"])
    assignee_ids = data.pop("assignee_ids", None)
    if data.get("assignee_id") and not db.get(Employee, data["assignee_id"]):
        raise HTTPException(status_code=404, detail="Assignee not found")
    for key, value in data.items():
        setattr(task, key, value)
    if assignee_ids is not None:
        _sync_assignments(task, assignee_ids, db)
        task.assignee_id = assignee_ids[0] if assignee_ids else task.assignee_id
    audit(db, actor.id, "Task Updated", "Task Tracker", f"Task {task.title} updated")
    db.commit()
    db.refresh(task)
    return _hydrate_task(task, db)


@router.put("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> Task:
    if payload.status is None:
        raise HTTPException(status_code=400, detail="Status is required")
    return update_task(task_id, TaskUpdate(status=payload.status, blocker_reason=payload.blocker_reason), db, actor)


@router.post("/{task_id}/submit-for-review", response_model=TaskOut)
def submit_for_review(
    task_id: str,
    _: TaskReviewSubmit,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if actor.id not in {task.assignee_id, *[assignment.employee_id for assignment in task.assignments]}:
        raise HTTPException(status_code=403, detail="Only assigned employees can submit this task for review")
    task.status = TaskStatus.REVIEW
    task.submitted_for_review_at = datetime.now(timezone.utc)
    audit(db, actor.id, "Task Submitted for Review", "Task Tracker", f"Task {task.title} submitted for review")
    db.commit()
    db.refresh(task)
    return _hydrate_task(task, db)


@router.post("/{task_id}/approval", response_model=TaskOut)
def task_approval(
    task_id: str,
    payload: TaskApprovalAction,
    db: Session = Depends(get_db),
    actor: Employee = Depends(require_min_role(Role.TEAM_LEAD)),
) -> Task:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if payload.action == "approve":
        task.status = TaskStatus.DONE
        task.approved_at = datetime.now(timezone.utc)
        task.rejection_reason = None
    elif payload.action in {"reject", "changes_requested"}:
        task.status = TaskStatus.IN_PROGRESS
        task.rejection_reason = payload.comment or "Changes requested"
    elif payload.action == "block":
        task.status = TaskStatus.BLOCKED
        task.blocker_reason = payload.comment or task.blocker_reason
    elif payload.action == "unblock":
        task.status = TaskStatus.IN_PROGRESS
        task.blocker_reason = None
    audit(db, actor.id, f"Task {payload.action.title()}", "Task Tracker", f"Task {task.title}: {payload.comment or payload.action}")
    db.commit()
    db.refresh(task)
    return _hydrate_task(task, db)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    audit(db, actor.id, "Task Deleted", "Task Tracker", f"Task {task.title} deleted")
    db.delete(task)
    db.commit()
    return None


@router.get("/{task_id}/comments", response_model=list[TaskCommentOut])
def list_comments(task_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[TaskComment]:
    if not db.get(Task, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    comments = db.scalars(select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at)).all()
    for comment in comments:
        setattr(comment, "author_name", comment.author.name if comment.author else None)
    return list(comments)


@router.post("/{task_id}/comments", response_model=TaskCommentOut, status_code=201)
def add_comment(
    task_id: str,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(get_current_user),
) -> TaskComment:
    if not db.get(Task, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    comment = TaskComment(task_id=task_id, author_id=actor.id, body=payload.body)
    db.add(comment)
    audit(db, actor.id, "Task Commented", "Task Tracker", f"Comment added to task {task_id}")
    db.commit()
    db.refresh(comment)
    setattr(comment, "author_name", actor.name)
    return comment
