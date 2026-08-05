import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Role(str, enum.Enum):
    INTERN = "intern"
    DEVELOPER = "developer"
    TEAM_LEAD = "team_lead"
    PROJECT_MANAGER = "project_manager"
    PROGRAM_MANAGER = "program_manager"
    DELIVERY_HEAD = "delivery_head"


class Availability(str, enum.Enum):
    ALLOCATED = "allocated"
    AVAILABLE = "available"
    ON_LEAVE = "on_leave"
    BENCH = "bench"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="Delivery")
    location: Mapped[str | None] = mapped_column(String(120))
    manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    skills: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    availability: Mapped[Availability] = mapped_column(Enum(Availability), nullable=False, default=Availability.AVAILABLE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    manager: Mapped["Employee | None"] = relationship(remote_side=[id], backref="direct_reports")
    allocations = relationship("ResourceAllocation", back_populates="employee", foreign_keys="ResourceAllocation.employee_id")
    weekly_statuses = relationship("WeeklyStatus", back_populates="employee")
