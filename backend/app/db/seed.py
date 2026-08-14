from datetime import date, datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.models.brd import BRDDesignArtifact, BRDDocument, BRDDocumentStatus, BRDRequirementSet
from app.models.delivery import Account, AccountStatus, AllocationRole, Health, Project, ProjectPhase, ResourceAllocation, RiskLevel
from app.models.email import EmailStatus, ScheduledEmail
from app.models.people import Employee, Role
from app.models.status import AIInsight, SubmissionStatus, WeeklyStatus
from app.models.tasks import Task, TaskAssignment, TaskPriority, TaskStatus


DEMO_PASSWORD = "Demo@123"


def _employee(db, email: str, **values) -> Employee:
    employee = db.query(Employee).filter(Employee.email == email).one_or_none()
    if employee:
        return employee
    employee = Employee(email=email, password_hash=hash_password(DEMO_PASSWORD), **values)
    db.add(employee)
    db.flush()
    return employee


def _account(db, name: str, **values) -> Account:
    account = db.query(Account).filter(Account.name == name).one_or_none()
    if account:
        return account
    account = Account(name=name, **values)
    db.add(account)
    db.flush()
    return account


def _project(db, name: str, account_id: str, **values) -> Project:
    project = db.query(Project).filter(Project.name == name, Project.account_id == account_id).one_or_none()
    if project:
        return project
    project = Project(name=name, account_id=account_id, **values)
    db.add(project)
    db.flush()
    return project


def _allocation(db, project_id: str, employee_id: str, **values) -> None:
    exists = db.query(ResourceAllocation).filter(
        ResourceAllocation.project_id == project_id,
        ResourceAllocation.employee_id == employee_id,
    ).one_or_none()
    if not exists:
        db.add(ResourceAllocation(project_id=project_id, employee_id=employee_id, **values))


def _task(db, project_id: str, title: str, assignee_ids: list[str], **values) -> Task:
    task = db.query(Task).filter(Task.project_id == project_id, Task.title == title).one_or_none()
    if not task:
        task = Task(project_id=project_id, title=title, assignee_id=assignee_ids[0] if assignee_ids else None, **values)
        db.add(task)
        db.flush()
    for employee_id in assignee_ids:
        exists = db.query(TaskAssignment).filter(TaskAssignment.task_id == task.id, TaskAssignment.employee_id == employee_id).one_or_none()
        if not exists:
            db.add(TaskAssignment(task_id=task.id, employee_id=employee_id))
    return task


def _weekly_status(db, employee_id: str, project_id: str, week_start: date, **values) -> None:
    exists = db.query(WeeklyStatus).filter(
        WeeklyStatus.employee_id == employee_id,
        WeeklyStatus.project_id == project_id,
        WeeklyStatus.week_start == week_start,
    ).one_or_none()
    if not exists:
        db.add(WeeklyStatus(employee_id=employee_id, project_id=project_id, week_start=week_start, **values))


def _brd_document(db, project_id: str, filename: str, uploaded_by_id: str, extracted_text: str) -> BRDDocument:
    document = db.query(BRDDocument).filter(BRDDocument.project_id == project_id, BRDDocument.filename == filename).one_or_none()
    if document:
        return document
    document = BRDDocument(
        project_id=project_id,
        filename=filename,
        document_type="brd",
        content_type="text/plain",
        size_bytes=len(extracted_text.encode("utf-8")),
        status=BRDDocumentStatus.READY,
        uploaded_by_id=uploaded_by_id,
        extracted_text=extracted_text,
    )
    db.add(document)
    db.flush()
    return document


def _requirements(db, document: BRDDocument) -> None:
    exists = db.query(BRDRequirementSet).filter(BRDRequirementSet.document_id == document.id, BRDRequirementSet.version == 1).one_or_none()
    if not exists:
        db.add(BRDRequirementSet(
            document_id=document.id,
            project_id=document.project_id,
            version=1,
            overview="Customer portal modernization with secure onboarding, account dashboard, payments, notifications, and audit reporting.",
            functional_json='["Customer login and MFA", "Account summary dashboard", "Payment initiation workflow", "Admin audit reports"]',
            non_functional_json='["RBAC", "99.9% availability", "PII masking", "Exportable compliance reports"]',
            assumptions_json='["Client identity provider is available", "Payment gateway credentials arrive before Sprint 5"]',
            created_by="Demo Seed",
        ))


def _artifact(db, project_id: str, document_id: str, artifact_type: str, title: str, payload_json: str) -> None:
    exists = db.query(BRDDesignArtifact).filter(
        BRDDesignArtifact.project_id == project_id,
        BRDDesignArtifact.artifact_type == artifact_type,
        BRDDesignArtifact.version == 1,
    ).one_or_none()
    if not exists:
        db.add(BRDDesignArtifact(
            project_id=project_id,
            document_id=document_id,
            artifact_type=artifact_type,
            version=1,
            title=title,
            payload_json=payload_json,
            ai_provider="demo",
            model_used="seeded",
        ))


def seed() -> None:
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    if not settings.seed_demo_data:
        return

    with SessionLocal() as db:
        studio_head = _employee(db, "praveen.baburaya@delta.com", name="Praveen Kumar Baburaya", title="Studio Head", role=Role.DELIVERY_HEAD, department="Delivery Leadership")
        pm1 = _employee(db, "gowtham.rallabandi@delta.com", name="Gowtham Rallabandi", title="Program Manager", role=Role.PROGRAM_MANAGER, department="Program Office", manager_id=studio_head.id)
        pm2 = _employee(db, "rambabu.bagati@delta.com", name="Rambabu Bagati", title="Program Manager", role=Role.PROGRAM_MANAGER, department="Program Office", manager_id=studio_head.id)
        proj_m1 = _employee(db, "shanmukha.rewal@delta.com", name="Shanmukha Rewal", title="Project Manager", role=Role.PROJECT_MANAGER, department="Delivery Operations", manager_id=pm1.id)
        proj_m2 = _employee(db, "amrita.kumari@delta.com", name="Amrita Kumari", title="Project Manager", role=Role.PROJECT_MANAGER, department="Delivery Operations", manager_id=pm1.id)
        lead = _employee(db, "ravi.teja@delta.com", name="Ravi Teja Reddy", title="Team Lead", role=Role.TEAM_LEAD, department="Engineering", manager_id=proj_m1.id)
        architect = _employee(db, "suresh.babu@delta.com", name="Suresh Babu", title="Architect", role=Role.TEAM_LEAD, department="Architecture", manager_id=proj_m1.id)
        sr_dev = _employee(db, "deepak.sharma@delta.com", name="Deepak Sharma", title="Senior Developer", role=Role.DEVELOPER, department="Engineering", manager_id=lead.id, skills="React,FastAPI,MySQL")
        dev = _employee(db, "sneha.patil@delta.com", name="Sneha Patil", title="Developer", role=Role.DEVELOPER, department="Engineering", manager_id=lead.id, skills="React,TypeScript")
        qa = _employee(db, "karthik.venkat@delta.com", name="Karthik Venkat", title="QA Engineer", role=Role.DEVELOPER, department="Quality Assurance", manager_id=lead.id, skills="Automation,Playwright")
        devops = _employee(db, "manoj.kumar@delta.com", name="Manoj Kumar", title="DevOps Engineer", role=Role.DEVELOPER, department="Platform", manager_id=lead.id, skills="Docker,Redis,AWS")
        intern = _employee(db, "aditya.verma@delta.com", name="Aditya Verma", title="Engineering Intern", role=Role.INTERN, department="Engineering", manager_id=dev.id)

        acc1 = _account(db, "Acme Corp", industry="Financial Services", country="United States", business_unit="Banking", contract_value=2500000.0, status=AccountStatus.ACTIVE, health=Health.GREEN, delivery_head_id=studio_head.id, program_manager_id=pm1.id)
        acc2 = _account(db, "Global Tech Solutions", industry="Technology", country="United Kingdom", business_unit="Digital", contract_value=1800000.0, status=AccountStatus.ACTIVE, health=Health.GREEN, delivery_head_id=studio_head.id, program_manager_id=pm2.id)
        acc3 = _account(db, "Meridian Health", industry="Healthcare", country="Canada", business_unit="Health Systems", contract_value=3200000.0, status=AccountStatus.ACTIVE, health=Health.AMBER, delivery_head_id=studio_head.id, program_manager_id=pm2.id)

        proj1 = _project(db, "Retail Banking Portal", acc1.id, phase=ProjectPhase.DEVELOPMENT, health=Health.AMBER, risk=RiskLevel.MEDIUM, client="Acme Corp", budget_used=1.2, budget_total=2.5, program_manager_id=pm1.id, project_manager_id=proj_m1.id, team_lead_id=architect.id, tech_stack="React,FastAPI,MySQL,ChromaDB,Groq", sprint_number=5, description="Modernizing online retail banking portal and customer dashboard.", start_date=date(2026, 6, 1), completion_percent=72)
        proj2 = _project(db, "Fleet Dispatch Engine", acc2.id, phase=ProjectPhase.BETA_TESTING, health=Health.GREEN, risk=RiskLevel.MEDIUM, client="Global Tech Solutions", budget_used=0.9, budget_total=1.8, program_manager_id=pm2.id, project_manager_id=proj_m2.id, team_lead_id=architect.id, tech_stack="Python,FastAPI,Redis,Docker", sprint_number=7, description="Real-time vehicle dispatch engine and route optimization service.", start_date=date(2026, 5, 15), completion_percent=84)
        proj3 = _project(db, "Patient Records Gateway", acc3.id, phase=ProjectPhase.PLANNING, health=Health.AMBER, risk=RiskLevel.HIGH, client="Meridian Health", budget_used=0.4, budget_total=3.2, program_manager_id=pm2.id, project_manager_id=proj_m2.id, team_lead_id=architect.id, tech_stack="Java,Spring Boot,AWS,FHIR", sprint_number=2, description="HIPAA-compliant EHR gateway and patient health record synchronization.", start_date=date(2026, 7, 10), completion_percent=28)

        for project, employee, role in [
            (proj1, sr_dev, AllocationRole.DEVELOPER), (proj1, dev, AllocationRole.DEVELOPER), (proj1, qa, AllocationRole.QA),
            (proj2, devops, AllocationRole.DEVOPS), (proj2, sr_dev, AllocationRole.DEVELOPER), (proj3, intern, AllocationRole.INTERN),
        ]:
            _allocation(db, project.id, employee.id, allocation_role=role, allocation_percent=100, start_date=project.start_date or date.today(), reporting_manager_id=project.project_manager_id, created_by_id=studio_head.id)

        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        _weekly_status(db, sr_dev.id, proj1.id, week_start, status=SubmissionStatus.SUBMITTED, submitted_at=datetime.now(timezone.utc), fields={"achievements": "Completed API integration shell and started payment gateway mapping.", "blockers": "Client credentials pending.", "overallStatus": "Amber", "completionPercent": 72, "hoursWorked": 41})
        _weekly_status(db, qa.id, proj1.id, week_start, status=SubmissionStatus.DRAFT, fields={"achievements": "Regression suite updated.", "blockers": "Waiting for stable UAT build.", "overallStatus": "Green", "completionPercent": 68, "hoursWorked": 38})

        _task(db, proj1.id, "Complete payment gateway credential integration", [sr_dev.id, dev.id], description="Wire client-provided payment credentials into sandbox and production config.", status=TaskStatus.BLOCKED, priority=TaskPriority.CRITICAL, due_date=today + timedelta(days=3), estimate_hours=16, actual_hours=5, labels="integration,client-dependency", tags=["payments", "blocked"], checklist=[{"label": "Receive credentials", "done": False}, {"label": "Validate sandbox payment", "done": False}], blocker_reason="Client has not shared credentials.")
        _task(db, proj1.id, "Review BRD requirements coverage", [architect.id], description="Validate extracted BRD requirements against project scope.", status=TaskStatus.REVIEW, priority=TaskPriority.HIGH, due_date=today + timedelta(days=2), estimate_hours=6, labels="brd,architecture", tags=["brd"], checklist=[{"label": "Functional coverage", "done": True}, {"label": "NFR coverage", "done": False}])
        _task(db, proj2.id, "Prepare route optimization demo", [devops.id], description="Package route optimization demo with Redis-backed dispatch simulation.", status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM, due_date=today + timedelta(days=5), estimate_hours=12, labels="demo,redis", tags=["demo"])
        _task(db, proj3.id, "Define FHIR entity model", [intern.id, architect.id], description="Draft patient, encounter, provider, and audit entities for review.", status=TaskStatus.TODO, priority=TaskPriority.HIGH, due_date=today + timedelta(days=8), estimate_hours=10, labels="database,healthcare", tags=["fhir"])

        brd_specs = [
            (
                proj1,
                "retail-banking-portal-brd.txt",
                "The retail banking portal supports secure login, MFA, account summaries, payment initiation, notifications, audit reports, RBAC, and client-ready executive reporting. API integration is blocked until client credentials are received.",
                "Retail Banking",
            ),
            (
                proj2,
                "fleet-dispatch-engine-brd.txt",
                "The fleet dispatch engine provides dispatcher dashboards, vehicle telemetry ingestion, route optimization, SLA alerts, depot capacity views, and operational reporting. GPS vendor APIs and route simulation data are key delivery dependencies.",
                "Fleet Dispatch",
            ),
            (
                proj3,
                "patient-records-gateway-brd.txt",
                "The patient records gateway synchronizes FHIR resources across providers, validates consent, logs access, exposes patient search, and reports data quality. Integration with client identity and EHR sandbox environments is required.",
                "Patient Records",
            ),
        ]
        for project, filename, text, label in brd_specs:
            document = _brd_document(db, project.id, filename, architect.id, text)
            _requirements(db, document)
            _artifact(db, project.id, document.id, "business_flow", f"{label} Business Flow", '{"nodes":[{"id":"intake","label":"Intake"},{"id":"validate","label":"Validate"},{"id":"execute","label":"Execute"},{"id":"report","label":"Report"}],"edges":[{"source":"intake","target":"validate"},{"source":"validate","target":"execute"},{"source":"execute","target":"report"}]}')
            _artifact(db, project.id, document.id, "architecture", f"{label} Solution Architecture", '{"layers":[{"name":"Experience","components":["Role Dashboards","Admin Console"]},{"name":"API","components":["FastAPI Gateway","RBAC"]},{"name":"Data","components":["MySQL","ChromaDB"]}],"decisions":["One project ID","Common AI service"]}')
            _artifact(db, project.id, document.id, "database_design", f"{label} Database Design", '{"entities":[{"name":"projects"},{"name":"tasks"},{"name":"documents"},{"name":"audit_logs"}],"databaseTech":"MySQL"}')

        if not db.query(AIInsight).filter(AIInsight.project_id == proj1.id, AIInsight.week_start == week_start).one_or_none():
            db.add(AIInsight(project_id=proj1.id, week_start=week_start, provider="demo", model="seeded", executive_summary="Delivery is at medium risk because API credential dependency is blocking payment integration.", risk_level="Medium", recommendations={"items": ["Escalate client credential dependency", "Keep QA regression warm", "Review BRD coverage before Sprint 6"]}, health_score=68, sentiment_score=7))

        if not db.query(ScheduledEmail).filter(ScheduledEmail.subject == "Retail Banking Portal weekly dependency update").one_or_none():
            db.add(ScheduledEmail(sender_id=proj_m1.id, recipients=[lead.email, architect.email], subject="Retail Banking Portal weekly dependency update", body="Please review the credential dependency and task blockers before the governance sync.", email_type="project_update", project_id=proj1.id, scheduled_at=datetime.now(timezone.utc) + timedelta(days=1), status=EmailStatus.SCHEDULED))

        db.commit()


if __name__ == "__main__":
    seed()
