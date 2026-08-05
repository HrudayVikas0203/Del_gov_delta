from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.models.people import Employee, Role

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expires, **(claims or {})}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Employee:
    payload = decode_token(token)
    employee = db.get(Employee, payload.get("sub"))
    if employee is None or not employee.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or not found")
    return employee


ROLE_RANK: dict[Role, int] = {
    Role.INTERN: 10,
    Role.DEVELOPER: 20,
    Role.TEAM_LEAD: 30,
    Role.PROJECT_MANAGER: 40,
    Role.PROGRAM_MANAGER: 50,
    Role.DELIVERY_HEAD: 60,
}


def require_roles(*roles: Role):
    def dependency(user: Employee = Depends(get_current_user)) -> Employee:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permissions")
        return user

    return dependency


def require_min_role(role: Role):
    def dependency(user: Employee = Depends(get_current_user)) -> Employee:
        if ROLE_RANK[user.role] < ROLE_RANK[role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role authority")
        return user

    return dependency
