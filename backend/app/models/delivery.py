import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Health(str, enum.Enum):
    GREEN = "green"
    AMBER = "amber"
    RED = "red"


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    PROPOSAL = "proposal"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class ProjectPhase(str, enum.Enum):
    PLANNING = "planning"
    DEVELOPMENT = "development"
    BETA_TESTING = "beta_testing"
    UAT = "uat"
    PRODUCTION = "production"
    MAINTENANCE = "maintenance"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AllocationRole(str, enum.Enum):
    STUDIO_HEAD = "studio_head"
    INTERN = "intern"
    DEVELOPER = "developer"
    TEAM_LEAD = "team_lead"
    PROJECT_MANAGER = "project_manager"
    PROGRAM_MANAGER = "program_manager"
    ARCHITECT = "architect"
    QA = "qa"
    DEVOPS = "devops"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    industry: Mapped[str] = mapped_column(String(120), nullable=False)
    country: Mapped[str] = mapped_column(String(80), nullable=False)
    business_unit: Mapped[str] = mapped_column(String(120), nullable=False)
    contract_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus), nullable=False, default=AccountStatus.ACTIVE)
    health: Mapped[Health] = mapped_column(Enum(Health), nullable=False, default=Health.GREEN)
    delivery_head_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    program_manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    projects = relationship("Project", back_populates="account", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    client: Mapped[str | None] = mapped_column(String(180))
    phase: Mapped[ProjectPhase] = mapped_column(Enum(ProjectPhase), nullable=False, default=ProjectPhase.PLANNING)
    health: Mapped[Health] = mapped_column(Enum(Health), nullable=False, default=Health.GREEN)
    risk: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), nullable=False, default=RiskLevel.LOW)
    budget_used: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    budget_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    program_manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    project_manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    team_lead_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    tech_stack: Mapped[str | None] = mapped_column(Text)
    sprint_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    account = relationship("Account", back_populates="projects")
    allocations = relationship("ResourceAllocation", back_populates="project", cascade="all, delete-orphan")
    weekly_statuses = relationship("WeeklyStatus", back_populates="project")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    brd_documents = relationship("BRDDocument", back_populates="project", cascade="all, delete-orphan")
    brd_artifacts = relationship("BRDDesignArtifact", back_populates="project", cascade="all, delete-orphan")


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"
    __table_args__ = (UniqueConstraint("project_id", "employee_id", name="uq_project_employee_allocation"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    employee_id: Mapped[str] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False)
    allocation_role: Mapped[AllocationRole] = mapped_column(Enum(AllocationRole), nullable=False)
    allocation_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    reporting_manager_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="allocations")
    employee = relationship("Employee", back_populates="allocations", foreign_keys=[employee_id])
