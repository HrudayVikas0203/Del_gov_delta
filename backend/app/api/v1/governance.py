from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from pptx import Presentation

from app.core.security import get_current_user, require_min_role
from app.core.config import get_settings
from app.db.session import get_db
from app.models.delivery import Account, Project, ResourceAllocation
from app.models.people import Employee, Role
from app.models.status import ReportTemplate, WeeklyStatus
from app.rag.store import index_statuses
from app.schemas.common import AccountCreate, AccountUpdate, AccountOut, AllocationCreate, AllocationOut, ProjectCreate, ProjectUpdate, ProjectOut, WeeklyStatusCreate, WeeklyStatusOut
from app.services.allocation import create_allocation
from app.services.audit import audit

router = APIRouter(prefix="/governance", tags=["governance"])


def _account_template(db: Session, account_id: str) -> ReportTemplate | None:
    return db.scalar(
        select(ReportTemplate)
        .where(
            ReportTemplate.account_id == account_id,
            ReportTemplate.project_id.is_(None),
            ReportTemplate.file_type == "pptx",
        )
        .order_by(ReportTemplate.uploaded_at.desc())
    )


def _account_response(db: Session, account: Account) -> Account:
    template = _account_template(db, account.id)
    setattr(account, "ppt_template_id", template.id if template else None)
    setattr(account, "ppt_template_filename", template.filename or template.name if template else None)
    setattr(account, "ppt_template_status", "configured" if template else "not_configured")
    return account


@router.get("/employees", response_model=list[dict])
def list_employees(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[dict]:
    rows = db.scalars(select(Employee).order_by(Employee.name)).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "title": row.title,
            "role": row.role.value,
            "department": row.department,
            "location": row.location,
            "manager_id": row.manager_id,
            "availability": row.availability.value,
            "skills": row.skills.split(",") if row.skills else [],
            "is_active": row.is_active,
        }
        for row in rows
    ]


@router.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> Account:
    account = Account(**payload.model_dump())
    db.add(account)
    audit(db, actor.id, "Account Created", "Accounts", f"Account {account.name} created")
    db.commit()
    db.refresh(account)
    return _account_response(db, account)


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[Account]:
    return [_account_response(db, account) for account in db.scalars(select(Account).order_by(Account.name)).all()]


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> Account:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return _account_response(db, account)


@router.put("/accounts/{account_id}", response_model=AccountOut)
def update_account(account_id: str, payload: AccountUpdate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> Account:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, key, value)
    audit(db, actor.id, "Account Updated", "Accounts", f"Account {account.name} updated")
    db.commit()
    db.refresh(account)
    return _account_response(db, account)


@router.post("/accounts/{account_id}/template", response_model=dict, status_code=201)
def upload_account_template(
    account_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER)),
) -> dict:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if Path(file.filename or "").suffix.lower() != ".pptx":
        raise HTTPException(status_code=400, detail="Only .pptx account templates are supported")

    settings = get_settings()
    content = file.file.read()
    try:
        Presentation(BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The uploaded PPTX template is corrupt or unreadable") from exc

    existing = _account_template(db, account_id)
    if existing:
        old_path = Path(existing.file_path)
        if old_path.exists():
            old_path.unlink()
        template = existing
    else:
        template = ReportTemplate(name=Path(file.filename).stem, file_type="pptx", account_id=account_id)
        db.add(template)

    saved_path = settings.templates_dir / f"account_{account_id}_{uuid.uuid4()}.pptx"
    saved_path.write_bytes(content)
    template.name = Path(file.filename).stem
    template.filename = file.filename
    template.file_path = str(saved_path)
    template.file_type = "pptx"
    template.content_type = file.content_type
    template.size_bytes = len(content)
    template.content_bytes = content
    template.uploaded_by_id = actor.id
    template.project_id = None
    audit(db, actor.id, "Account Template Updated", "Accounts", f"PPT template updated for account {account.name}")
    db.commit()
    db.refresh(template)
    return {"id": template.id, "filename": template.filename, "status": "configured"}


@router.delete("/accounts/{account_id}/template", status_code=204)
def delete_account_template(account_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    template = _account_template(db, account_id)
    if not template:
        raise HTTPException(status_code=404, detail="No PPT template configured for this account")
    path = Path(template.file_path)
    if path.exists():
        path.unlink()
    audit(db, actor.id, "Account Template Removed", "Accounts", f"PPT template removed for account {account.name}")
    db.delete(template)
    db.commit()
    return None


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    audit(db, actor.id, "Account Deleted", "Accounts", f"Account {account.name} deleted")
    db.delete(account)
    db.commit()
    return None


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> Project:
    data = payload.model_dump(exclude={"tech_stack"})
    if actor.role == Role.PROJECT_MANAGER and not data.get("project_manager_id"):
        data["project_manager_id"] = actor.id
    if actor.role == Role.PROGRAM_MANAGER and not data.get("program_manager_id"):
        data["program_manager_id"] = actor.id
    data["tech_stack"] = ",".join(payload.tech_stack)
    project = Project(**data)
    db.add(project)
    audit(db, actor.id, "Project Created", "Projects", f"Project {project.name} created")
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.name)).all())


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> Project:
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = payload.model_dump(exclude_unset=True)
    if "tech_stack" in data and data["tech_stack"] is not None:
        data["tech_stack"] = ",".join(data["tech_stack"])
    for key, value in data.items():
        setattr(project, key, value)
    audit(db, actor.id, "Project Updated", "Projects", f"Project {project.name} updated")
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    audit(db, actor.id, "Project Deleted", "Projects", f"Project {project.name} deleted")
    db.delete(project)
    db.commit()
    return None


@router.post("/allocations", response_model=AllocationOut, status_code=201)
def allocate(payload: AllocationCreate, db: Session = Depends(get_db), actor: Employee = Depends(get_current_user)):
    allocation = create_allocation(db, payload, actor)
    # create_allocation doesn't pre-populate the joined properties, we could reload or just return it.
    # The response model will ignore missing fields, but we should try to populate names
    project = db.get(Project, allocation.project_id)
    employee = db.get(Employee, allocation.employee_id)
    setattr(allocation, "project_name", project.name if project else None)
    setattr(allocation, "employee_name", employee.name if employee else None)
    setattr(allocation, "employee_title", employee.title if employee else None)
    setattr(allocation, "employee_email", employee.email if employee else None)
    setattr(allocation, "department", employee.department if employee else None)
    return allocation


@router.get("/allocations", response_model=list[AllocationOut])
def list_allocations(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)):
    allocations = db.scalars(select(ResourceAllocation)).all()
    # Populate names for frontend
    result = []
    for alloc in allocations:
        project = db.get(Project, alloc.project_id)
        employee = db.get(Employee, alloc.employee_id)
        setattr(alloc, "project_name", project.name if project else None)
        setattr(alloc, "employee_name", employee.name if employee else None)
        setattr(alloc, "employee_title", employee.title if employee else None)
        setattr(alloc, "employee_email", employee.email if employee else None)
        setattr(alloc, "department", employee.department if employee else None)
        result.append(alloc)
    return result


@router.delete("/allocations/{allocation_id}", status_code=204)
def delete_allocation(allocation_id: str, db: Session = Depends(get_db), actor: Employee = Depends(get_current_user)):
    allocation = db.get(ResourceAllocation, allocation_id)
    if not allocation:
        raise HTTPException(status_code=404, detail="Allocation not found")
    
    # Check permissions (must be PM or higher, or the one who created it)
    from app.core.security import ROLE_RANK
    if ROLE_RANK[actor.role] < ROLE_RANK[Role.PROJECT_MANAGER] and allocation.created_by_id != actor.id:
         raise HTTPException(status_code=403, detail="Not authorized to delete this allocation")
         
    audit(db, actor.id, "Resource Deallocated", "Projects", f"Deallocated employee {allocation.employee_id} from project {allocation.project_id}")
    db.delete(allocation)
    db.commit()
    return None


@router.post("/status", response_model=WeeklyStatusOut, status_code=201)
def submit_status(payload: WeeklyStatusCreate, db: Session = Depends(get_db), actor: Employee = Depends(get_current_user)) -> WeeklyStatus:
    status = WeeklyStatus(**payload.model_dump())
    if status.status.value == "submitted":
        status.submitted_at = datetime.now(timezone.utc)
    db.add(status)
    audit(db, actor.id, "Status Saved", "Weekly Status", f"Status saved for employee {payload.employee_id}")
    db.commit()
    db.refresh(status)
    index_statuses(db, [status])
    return status


@router.get("/status", response_model=list[WeeklyStatusOut])
def list_statuses(db: Session = Depends(get_db), _: Employee = Depends(get_current_user)) -> list[WeeklyStatus]:
    return list(db.scalars(select(WeeklyStatus).order_by(WeeklyStatus.week_start.desc())).all())


@router.post("/rag/reindex", response_model=dict)
def reindex(db: Session = Depends(get_db), _: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> dict:
    return {"indexed": index_statuses(db)}
