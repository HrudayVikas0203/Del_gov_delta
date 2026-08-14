from datetime import datetime, timezone
from email.message import EmailMessage
import smtplib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.email import EmailStatus, ScheduledEmail


def smtp_is_configured() -> bool:
    settings = get_settings()
    return bool((settings.from_email or settings.smtp_user) and settings.smtp_host and settings.smtp_port)


def send_email_record(db: Session, email: ScheduledEmail) -> ScheduledEmail:
    settings = get_settings()
    try:
        sender = settings.from_email or settings.smtp_user
        if not sender:
            raise RuntimeError("SMTP credentials are not configured. Set SMTP_USER/SMTP_PASSWORD or FROM_EMAIL.")
        message = EmailMessage()
        message["From"] = sender
        message["To"] = ", ".join(email.recipients)
        message["Subject"] = email.subject
        message.set_content(email.body)
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
            send_email_record(db, email)
        return len(due)
