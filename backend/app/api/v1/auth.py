from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, hash_password, require_min_role, verify_password
from app.db.session import get_db
from app.models.people import Employee, Role
from app.schemas.common import EmployeeCreate, EmployeeOut, LoginIn, TokenOut
from app.services.audit import audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    employee = db.scalar(select(Employee).where(Employee.email == payload.email))
    if employee is None or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    audit(db, employee.id, "Login", "Authentication", "User logged in")
    db.commit()
    return TokenOut(access_token=create_access_token(employee.id, {"role": employee.role.value}))


@router.get("/me", response_model=EmployeeOut)
def me(user: Employee = Depends(get_current_user)) -> Employee:
    return user


@router.post("/users", response_model=EmployeeOut, status_code=201)
def create_user(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    actor: Employee = Depends(require_min_role(Role.PROJECT_MANAGER)),
) -> Employee:
    if db.scalar(select(Employee).where(Employee.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    employee = Employee(
        **payload.model_dump(exclude={"password", "skills"}),
        password_hash=hash_password(payload.password),
        skills=",".join(payload.skills),
    )
    db.add(employee)
    audit(db, actor.id, "User Created", "People", f"{employee.name} created with role {employee.role.value}")
    db.commit()
    db.refresh(employee)
    return employee
