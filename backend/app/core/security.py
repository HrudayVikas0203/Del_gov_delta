import logging
import os
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

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
DEBUG_AUTH = os.getenv("DEBUG_AUTH", "").strip().lower() == "true"


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
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        if DEBUG_AUTH:
            logger.info("TOKEN_DECODE_SUCCESS sub=%s", payload.get("sub"))
        return payload
    except jwt.ExpiredSignatureError as exc:
        if DEBUG_AUTH:
            logger.warning("TOKEN_EXPIRED")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    except jwt.PyJWTError as exc:
        if DEBUG_AUTH:
            logger.warning("TOKEN_DECODE_FAILED error_type=%s", type(exc).__name__)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Employee:
    payload = decode_token(token)
    employee_id = payload.get("sub")
    employee = db.get(Employee, employee_id)
    if employee is None:
        if DEBUG_AUTH:
            logger.warning("USER_NOT_FOUND employee_id=%s", employee_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or not found")
    if not employee.is_active:
        if DEBUG_AUTH:
            logger.warning("USER_INACTIVE employee_id=%s", employee_id)
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
