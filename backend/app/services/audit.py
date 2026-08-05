from sqlalchemy.orm import Session

from app.models.status import AuditLog


def audit(db: Session, user_id: str | None, action: str, module: str, details: str, ip_address: str | None = None) -> None:
    db.add(AuditLog(user_id=user_id, action=action, module=module, details=details, ip_address=ip_address))
