from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.delivery import AccountStatus, AllocationRole, Health, ProjectPhase, RiskLevel
from app.models.brd import BRDDocumentStatus
from app.models.email import EmailStatus
from app.models.people import Availability, Role
from app.models.status import ReportFormat, ReportType, SubmissionStatus
from app.models.tasks import TaskPriority, TaskStatus


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
    ppt_template_id: str | None = None
    ppt_template_filename: str | None = None
    ppt_template_status: str = "not_configured"


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


class TaskCreate(BaseModel):
    project_id: str
    title: str = Field(min_length=3, max_length=220)
    description: str | None = None
    assignee_id: str | None = None
    assignee_ids: list[str] = []
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    estimate_hours: int = Field(default=0, ge=0)
    labels: list[str] = []
    tags: list[str] = []
    checklist: list[dict | str] = []
    blocker_reason: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=220)
    description: str | None = None
    assignee_id: str | None = None
    assignee_ids: list[str] | None = None
    due_date: date | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    estimate_hours: int | None = Field(default=None, ge=0)
    actual_hours: int | None = Field(default=None, ge=0)
    labels: list[str] | None = None
    tags: list[str] | None = None
    checklist: list[dict | str] | None = None
    blocker_reason: str | None = None
    rejection_reason: str | None = None


class TaskOut(ORMModel):
    id: str
    project_id: str
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    assignee_id: str | None
    reporter_id: str | None
    due_date: date | None
    estimate_hours: int
    actual_hours: int
    labels: list[str] = []
    tags: list[str] = []
    checklist: list[dict | str] = []
    assignee_ids: list[str] = []
    blocker_reason: str | None
    rejection_reason: str | None = None
    submitted_for_review_at: datetime | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    project_name: str | None = None
    assignee_name: str | None = None


class TaskCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class TaskCommentOut(ORMModel):
    id: str
    task_id: str
    author_id: str | None
    body: str
    created_at: datetime
    author_name: str | None = None


class TaskReviewSubmit(BaseModel):
    note: str | None = None


class TaskApprovalAction(BaseModel):
    action: str = Field(pattern="^(approve|reject|changes_requested|block|unblock)$")
    comment: str | None = None


class ScheduledEmailCreate(BaseModel):
    recipients: list[EmailStr]
    subject: str | None = Field(default=None, min_length=3, max_length=255)
    body: str | None = Field(default=None, min_length=1)
    email_type: str = Field(default="custom", min_length=1, max_length=80)
    delivery: str = Field(default="schedule", pattern="^(send_now|schedule)$")
    task_id: str | None = None
    project_id: str | None = None
    scheduled_at: datetime | None = None


class ScheduledEmailUpdate(BaseModel):
    recipients: list[EmailStr] | None = None
    subject: str | None = Field(default=None, min_length=3, max_length=255)
    body: str | None = Field(default=None, min_length=1)
    scheduled_at: datetime | None = None


class ScheduledEmailOut(ORMModel):
    id: str
    sender_id: str | None
    recipients: list[EmailStr]
    subject: str
    body: str
    email_type: str
    task_id: str | None
    project_id: str | None
    scheduled_at: datetime | None
    status: EmailStatus
    error_message: str | None
    created_at: datetime
    sent_at: datetime | None


class BRDDocumentOut(ORMModel):
    id: str
    project_id: str
    filename: str
    document_type: str
    storage_path: str | None
    content_type: str | None
    size_bytes: int
    status: BRDDocumentStatus
    uploaded_by_id: str | None
    uploaded_at: datetime
    project_name: str | None = None


class RequirementSave(BaseModel):
    document_id: str
    project_id: str
    overview: str | None = None
    functional: list[dict | str] = []
    non_functional: list[dict | str] = []
    assumptions: list[dict | str] = []
    created_by: str = "AI Engine"


class RequirementOut(ORMModel):
    id: str
    document_id: str
    project_id: str
    version: int
    overview: str | None
    functional: list[dict | str] = []
    non_functional: list[dict | str] = []
    assumptions: list[dict | str] = []
    created_by: str
    created_at: datetime


class BRDArtifactCreate(BaseModel):
    project_id: str
    document_id: str | None = None
    artifact_type: str = Field(pattern="^(business_flow|architecture|database_design)$")
    title: str = Field(min_length=3, max_length=180)
    payload: dict
    ai_provider: str | None = None
    model_used: str | None = None


class BRDGenerateRequest(BaseModel):
    project_id: str
    document_id: str | None = None
    artifact_type: str = Field(pattern="^(requirements|business_flow|architecture|database_design|executive_report)$")
    prompt: str | None = None
    provider: str = "groq"
    model: str | None = None


class BRDChatRequest(BaseModel):
    project_id: str
    question: str
    session_id: str = "default"
    provider: str = "groq"
    model: str | None = None


class BRDChatOut(BaseModel):
    answer: str
    sources: list[dict] = []


class BRDArtifactOut(ORMModel):
    id: str
    project_id: str
    document_id: str | None
    artifact_type: str
    version: int
    title: str
    payload: dict
    ai_provider: str | None
    model_used: str | None
    created_by_id: str | None
    created_at: datetime


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
    status_frequency: str | None = Field(default=None, pattern="^(daily|weekly|monthly)$")
    use_celery: bool = True


class ReportTemplateOut(ORMModel):
    id: str
    name: str
    file_path: str
    file_type: str
    filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    account_id: str | None = None
    project_id: str | None = None
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
