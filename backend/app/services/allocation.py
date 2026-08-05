from fastapi import HTTPException, status
from sqlalchemy import func, select, exc
from sqlalchemy.orm import Session

from app.core.security import ROLE_RANK
from app.models.delivery import Project, ResourceAllocation
from app.models.people import Availability, Employee, Role
from app.schemas.common import AllocationCreate
from app.services.audit import audit

MANUAL_ALLOCATION_ROLES = {Role.PROJECT_MANAGER, Role.PROGRAM_MANAGER, Role.DELIVERY_HEAD}


def ensure_allocation_authority(actor: Employee, project: Project) -> None:
    if actor.role not in MANUAL_ALLOCATION_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only PM, program manager, or delivery head can allocate resources")
    if actor.role == Role.PROJECT_MANAGER and project.project_manager_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project managers can allocate only within their own projects")
    if actor.role == Role.PROGRAM_MANAGER and project.program_manager_id != actor.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Program managers can allocate only within their programs")


def create_allocation(db: Session, payload: AllocationCreate, actor: Employee) -> ResourceAllocation:
    project = db.get(Project, payload.project_id)
    employee = db.get(Employee, payload.employee_id)
    if project is None or employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project or employee not found")
    ensure_allocation_authority(actor, project)
    if ROLE_RANK[actor.role] <= ROLE_RANK[employee.role]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Allocator must be senior to the allocated employee")

    active_percent = db.scalar(
        select(func.coalesce(func.sum(ResourceAllocation.allocation_percent), 0)).where(
            ResourceAllocation.employee_id == payload.employee_id,
            ResourceAllocation.end_date.is_(None),
        )
    )
    if int(active_percent) + payload.allocation_percent > 100:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee allocation cannot exceed 100 percent")

    allocation = ResourceAllocation(**payload.model_dump(), created_by_id=actor.id)
    employee.availability = Availability.ALLOCATED
    db.add(allocation)
    try:
        db.commit()
        db.refresh(allocation)
    except exc.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee is already allocated to this project")
        
    audit(db, actor.id, "Resource Allocated", "Allocation", f"{employee.name} allocated to {project.name}")
    return allocation
