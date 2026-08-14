from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_min_role
from app.db.session import get_db
from app.models.delivery import Project
from app.models.email import EmailStatus, ScheduledEmail
from app.models.people import Employee, Role
from app.models.tasks import Task
from app.schemas.common import ScheduledEmailCreate, ScheduledEmailOut
from app.services.audit import audit
from app.services.email import dispatch_due_scheduled_emails, send_email_record, smtp_is_configured

router = APIRouter(prefix="/emails", tags=["email-scheduling"])


@router.get("/config", response_model=dict)
def email_config(_: Employee = Depends(get_current_user)) -> dict:
    return {"smtp_configured": smtp_is_configured()}


@router.get("", response_model=list[ScheduledEmailOut])
def list_scheduled_emails(db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))) -> list[ScheduledEmail]:
    stmt = select(ScheduledEmail).order_by(ScheduledEmail.created_at.desc())
    if actor.role not in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER}:
        stmt = stmt.where(ScheduledEmail.sender_id == actor.id)
    return list(db.scalars(stmt).all())


@router.post("", response_model=ScheduledEmailOut, status_code=201)
def schedule_email(
    payload: ScheduledEmailCreate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(require_min_role(Role.TEAM_LEAD)),
) -> ScheduledEmail:
    if payload.task_id and not db.get(Task, payload.task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    if payload.project_id and not db.get(Project, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    scheduled_at = payload.scheduled_at
    if scheduled_at and scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    if payload.delivery == "schedule":
        if not scheduled_at or scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Choose a future schedule time")
        status = EmailStatus.SCHEDULED
    else:
        status = EmailStatus.PENDING
        scheduled_at = None
    email = ScheduledEmail(
        sender_id=actor.id,
        recipients=[str(recipient) for recipient in payload.recipients],
        subject=payload.subject,
        body=payload.body,
        email_type=payload.email_type,
        task_id=payload.task_id,
        project_id=payload.project_id,
        scheduled_at=scheduled_at,
        status=status,
    )
    db.add(email)
    audit(db, actor.id, "Email Scheduled" if status == EmailStatus.SCHEDULED else "Email Queued", "Email Scheduling", payload.subject)
    db.commit()
    db.refresh(email)
    if payload.delivery == "send_now":
        send_email_record(db, email)
    return email


@router.post("/dispatch-due", response_model=dict)
def dispatch_due(_: Employee = Depends(require_min_role(Role.PROJECT_MANAGER))) -> dict:
    return {"dispatched": dispatch_due_scheduled_emails()}


@router.delete("/{email_id}", status_code=204)
def cancel_email(email_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))):
    email = db.get(ScheduledEmail, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    if email.sender_id != actor.id and actor.role not in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER}:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this email")
    if email.status in {EmailStatus.SENT, EmailStatus.FAILED}:
        raise HTTPException(status_code=400, detail="Completed emails cannot be cancelled")
    email.status = EmailStatus.CANCELLED
    audit(db, actor.id, "Email Cancelled", "Email Scheduling", email.subject)
    db.commit()
    return None
