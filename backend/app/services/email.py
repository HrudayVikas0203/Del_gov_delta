from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape
import smtplib

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.email import EmailStatus, ScheduledEmail


EMAIL_TEMPLATES = {
    "deadline_reminder": ("Reminder: Task Deadline Approaching", "Deadline Reminder"),
    "task_assigned": ("New Task Assigned to You", "Task Assigned"),
    "task_approved": ("Task Approved", "Task Approved"),
    "task_pending": ("Task Pending", "Task Pending"),
    "task_completed": ("Task Completed", "Task Completed"),
    "task_overdue": ("Task Overdue", "Task Overdue"),
    "task_rejected": ("Task Rejected", "Task Rejected"),
    "custom": ("", "Custom Email"),
}


def smtp_is_configured() -> bool:
    settings = get_settings()
    return bool(settings.smtp_user and settings.smtp_password and settings.smtp_host and settings.smtp_port)


def template_names() -> list[dict[str, str]]:
    return [{"id": key, "label": label, "subject": subject} for key, (subject, label) in EMAIL_TEMPLATES.items()]


def render_template(email_type: str, task, actor) -> tuple[str, str, str | None]:
    subject = EMAIL_TEMPLATES.get(email_type, EMAIL_TEMPLATES["custom"])[0]
    if email_type == "custom" or task is None:
        return subject, "", None
    actor_name = getattr(actor, "full_name", None) or getattr(actor, "email", "User")
    assignee = getattr(task.assignee, "full_name", None) or getattr(task.assignee, "email", None) or "Unassigned"
    status = getattr(task.status, "value", task.status)
    priority = getattr(task.priority, "value", task.priority)
    fields = {"Task name": task.title, "Description": task.description or "Not provided", "Assigned person": assignee, "Deadline": task.due_date.isoformat() if task.due_date else "Not set", "Priority": priority, "Current status": status, "Assigned by": actor_name, "Approved by": actor_name, "Completed by": actor_name, "Rejected by": actor_name, "Task link": f"/tasks/{task.id}"}
    selected = {"task_assigned": ["Task name", "Description", "Assigned by", "Deadline", "Priority"], "task_approved": ["Task name", "Approved by"], "task_pending": ["Task name", "Current status", "Assigned person", "Deadline"], "task_completed": ["Task name", "Completed by"], "task_overdue": ["Task name", "Deadline", "Assigned person"], "task_rejected": ["Task name", "Rejected by"]}.get(email_type, ["Task name", "Description", "Assigned person", "Deadline", "Priority"])
    text = "\n".join(f"{key}: {fields[key]}" for key in selected) + f"\nTask link: {fields['Task link']}"
    rows = "".join(f"<tr><th>{escape(key)}</th><td>{escape(str(fields[key]))}</td></tr>" for key in selected)
    html = f"<html><body style='font-family:Arial,sans-serif;color:#172033'><h1>Task Tracker</h1><h2>{escape(subject)}</h2><table>{rows}</table><p><a href='{escape(fields['Task link'])}' style='background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none'>View Task</a></p></body></html>"
    return subject, text, html


def send_email_record(db: Session, email: ScheduledEmail) -> ScheduledEmail:
    settings = get_settings()
    try:
        sender = settings.from_email or settings.smtp_user
        if not sender or not settings.smtp_password:
            raise RuntimeError("SMTP credentials are not configured.")
        message = EmailMessage()
        message["From"] = sender
        message["To"] = ", ".join(email.recipients)
        message["Subject"] = email.subject
        message.set_content(email.body)
        if email.html_body:
            message.add_alternative(email.html_body, subtype="html")
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_user and settings.smtp_password:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        email.status = EmailStatus.SENT
        email.sent_at = datetime.now(timezone.utc)
        email.error_message = None
    except Exception as exc:
        email.status = EmailStatus.FAILED
        email.error_message = str(exc)
    db.commit()
    db.refresh(email)
    return email


def dispatch_due_scheduled_emails() -> int:
    with SessionLocal() as db:
        due = db.scalars(
            select(ScheduledEmail)
            .where(ScheduledEmail.status == EmailStatus.SCHEDULED)
            .where(ScheduledEmail.scheduled_at <= datetime.now(timezone.utc))
            .order_by(ScheduledEmail.scheduled_at)
        ).all()
        for email in due:
            claimed = db.execute(
                update(ScheduledEmail)
                .where(ScheduledEmail.id == email.id, ScheduledEmail.status == EmailStatus.SCHEDULED)
                .values(status=EmailStatus.PENDING)
            ).rowcount
            db.commit()
            if not claimed:
                continue
            db.refresh(email)
            send_email_record(db, email)
        return len(due)
