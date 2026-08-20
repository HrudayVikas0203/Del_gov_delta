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
from app.schemas.common import ScheduledEmailCreate, ScheduledEmailOut, ScheduledEmailUpdate
from app.services.audit import audit
from app.services.email import dispatch_due_scheduled_emails, render_template, send_email_record, smtp_is_configured, template_names

router = APIRouter(prefix="/emails", tags=["email-scheduling"])


@router.get("/config", response_model=dict)
def email_config(_: Employee = Depends(get_current_user)) -> dict:
    return {"smtp_configured": smtp_is_configured()}


@router.get("/templates", response_model=list[dict])
def email_templates(_: Employee = Depends(get_current_user)) -> list[dict]:
    return template_names()


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
    task = db.get(Task, payload.task_id) if payload.task_id else None
    if payload.task_id and not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if payload.project_id and not db.get(Project, payload.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    generated_subject, generated_body, html_body = render_template(payload.email_type, task, actor)
    subject = payload.subject or generated_subject
    body = payload.body or generated_body
    if not subject or not body:
        raise HTTPException(status_code=400, detail="Subject and body are required for a custom email")
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
        subject=subject,
        body=body,
        email_type=payload.email_type,
        task_id=payload.task_id,
        project_id=payload.project_id,
        scheduled_at=scheduled_at,
        status=status,
        html_body=html_body,
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


@router.get("/{email_id}", response_model=ScheduledEmailOut)
def get_email(email_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))):
    email = db.get(ScheduledEmail, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    if email.sender_id != actor.id and actor.role not in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER}:
        raise HTTPException(status_code=403, detail="Not authorized to view this email")
    return email


@router.put("/{email_id}", response_model=ScheduledEmailOut)
def update_email(email_id: str, payload: ScheduledEmailUpdate, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))):
    email = db.get(ScheduledEmail, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    if email.sender_id != actor.id and actor.role not in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER}:
        raise HTTPException(status_code=403, detail="Not authorized to edit this email")
    if email.status != EmailStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Only scheduled emails can be edited")
    if payload.recipients is not None:
        email.recipients = [str(recipient) for recipient in payload.recipients]
    if payload.subject is not None:
        email.subject = payload.subject
    if payload.body is not None:
        email.body = payload.body
    if payload.scheduled_at is not None:
        email.scheduled_at = payload.scheduled_at
    if email.scheduled_at and email.scheduled_at.tzinfo is None:
        email.scheduled_at = email.scheduled_at.replace(tzinfo=timezone.utc)
    if not email.scheduled_at or email.scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Choose a future schedule time")
    db.commit()
    db.refresh(email)
    return email


@router.post("/{email_id}/retry", response_model=ScheduledEmailOut)
def retry_email(email_id: str, db: Session = Depends(get_db), actor: Employee = Depends(require_min_role(Role.TEAM_LEAD))):
    email = db.get(ScheduledEmail, email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
    if email.sender_id != actor.id and actor.role not in {Role.DELIVERY_HEAD, Role.PROGRAM_MANAGER}:
        raise HTTPException(status_code=403, detail="Not authorized to retry this email")
    if email.status != EmailStatus.FAILED:
        raise HTTPException(status_code=400, detail="Only failed emails can be retried")
    email.status = EmailStatus.PENDING
    db.commit()
    return send_email_record(db, email)
