from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.delivery import AccountStatus, AllocationRole, Health, ProjectPhase, RiskLevel
from app.models.people import Availability, Role
from app.models.status import ReportFormat, ReportType, SubmissionStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    title: str
    role: Role
    department: str = "Delivery"
    location: str | None = None
    manager_id: str | None = None
    skills: list[str] = []


class EmployeeOut(ORMModel):
    id: str
    name: str
    email: EmailStr
    title: str
    role: Role
    department: str
    location: str | None
    manager_id: str | None
    availability: Availability
    is_active: bool


class AccountCreate(BaseModel):
    name: str
    industry: str
    country: str
    business_unit: str
    contract_value: Decimal | None = None
    delivery_head_id: str | None = None
    program_manager_id: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    country: str | None = None
    business_unit: str | None = None
    contract_value: Decimal | None = None
    delivery_head_id: str | None = None
    program_manager_id: str | None = None
    status: AccountStatus | None = None
    health: Health | None = None
    start_date: date | None = None
    end_date: date | None = None


class AccountOut(ORMModel):
    id: str
    name: str
    industry: str
    country: str
    business_unit: str
    contract_value: Decimal | None
    status: AccountStatus
    health: Health
    delivery_head_id: str | None
    program_manager_id: str | None


class ProjectCreate(BaseModel):
    account_id: str
    name: str
    phase: ProjectPhase = ProjectPhase.PLANNING
    client: str | None = None
    budget_used: Decimal = 0
    budget_total: Decimal = 0
    program_manager_id: str | None = None
    project_manager_id: str | None = None
    team_lead_id: str | None = None
    tech_stack: list[str] = []
    sprint_number: int = 1
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    completion_percent: int = 0


class ProjectUpdate(BaseModel):
    name: str | None = None
    phase: ProjectPhase | None = None
    health: Health | None = None
    risk: RiskLevel | None = None
    budget_used: Decimal | None = None
    budget_total: Decimal | None = None
    program_manager_id: str | None = None
    project_manager_id: str | None = None
    team_lead_id: str | None = None
    tech_stack: list[str] | None = None
    sprint_number: int | None = None
    completion_percent: int | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class ProjectOut(ORMModel):
    id: str
    account_id: str
    name: str
    phase: ProjectPhase
    health: Health
    risk: RiskLevel
    client: str | None = None
    budget_used: Decimal
    budget_total: Decimal
    program_manager_id: str | None
    project_manager_id: str | None
    team_lead_id: str | None
    sprint_number: int
    completion_percent: int
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class AllocationCreate(BaseModel):
    project_id: str
    employee_id: str
    allocation_role: AllocationRole
    allocation_percent: int = Field(ge=1, le=100)
    start_date: date
    end_date: date | None = None
    reporting_manager_id: str | None = None


class AllocationOut(ORMModel):
    id: str
    project_id: str
    employee_id: str
    allocation_role: AllocationRole
    allocation_percent: int
    start_date: date
    end_date: date | None
    reporting_manager_id: str | None
    
    # We will compute these or use relationships in the endpoint
    project_name: str | None = None
    employee_name: str | None = None
    employee_title: str | None = None
    employee_email: str | None = None
    department: str | None = None


class WeeklyStatusCreate(BaseModel):
    employee_id: str
    project_id: str | None = None
    week_start: date
    status: SubmissionStatus = SubmissionStatus.DRAFT
    fields: dict = {}


class WeeklyStatusOut(ORMModel):
    id: str
    employee_id: str
    project_id: str | None
    week_start: date
    status: SubmissionStatus
    fields: dict
    manager_comment: str | None
    submitted_at: datetime | None
    updated_at: datetime


class LLMSelection(BaseModel):
    provider: str
    model: str | None = None


class RagQueryIn(BaseModel):
    question: str
    llm: LLMSelection | None = None
    project_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=12)


class RagQueryOut(BaseModel):
    answer: str
    provider: str | None
    model: str | None
    sources: list[dict]


class ReportCreate(BaseModel):
    title: str
    report_type: ReportType
    report_format: ReportFormat
    scope: str
    template_id: str | None = None
    llm: LLMSelection | None = None
    account_id: str | None = None
    project_id: str | None = None
    employee_id: str | None = None
    use_celery: bool = True


class ReportTemplateOut(ORMModel):
    id: str
    name: str
    file_path: str
    file_type: str
    uploaded_by_id: str | None
    uploaded_at: datetime


class ReportOut(ORMModel):
    id: str
    title: str
    type: ReportType = Field(alias='report_type')
    format: ReportFormat = Field(alias='report_format')
    scope: str
    template_id: str | None
    file_path: str | None
    status: str
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
