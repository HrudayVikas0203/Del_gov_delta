import os
import uuid
from pathlib import Path

os.environ.setdefault("DATABASE_BACKEND", "sqlite")

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.db.seed import seed
from app.db.session import Base, SessionLocal, engine
from app.models.delivery import Account, Project
from app.models.status import WeeklyStatus, ReportTemplate
from app.models.tasks import Task
from app.main import app


def test_account_project_allocation_status_and_ppt_flow() -> None:
    get_settings.cache_clear()
    Base.metadata.create_all(bind=engine)
    seed()
    suffix = uuid.uuid4().hex[:8]
    account_name = f"Northwind Capital {suffix}"
    project_name = f"Treasury Analytics {suffix}"

    client = TestClient(app)
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "gowtham.rallabandi@delta.com", "password": "Demo@123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    account_resp = client.post(
        "/api/v1/governance/accounts",
        json={
            "name": account_name,
            "industry": "Finance",
            "country": "USA",
            "business_unit": "Private Banking",
            "contract_value": 1500000,
            "start_date": "2026-08-01",
            "end_date": "2027-08-01",
        },
        headers=headers,
    )
    assert account_resp.status_code == 201, account_resp.text
    account_id = account_resp.json()["id"]

    project_resp = client.post(
        "/api/v1/governance/projects",
        json={
            "account_id": account_id,
            "name": project_name,
            "phase": "development",
            "client": account_name,
            "budget_used": 0,
            "budget_total": 1200000,
            "tech_stack": ["React", "FastAPI", "Postgres"],
            "sprint_number": 3,
            "description": "Modern treasury analytics and risk dashboard.",
            "start_date": "2026-08-05",
            "completion_percent": 55,
        },
        headers=headers,
    )
    assert project_resp.status_code == 201, project_resp.text
    project_id = project_resp.json()["id"]

    employee_resp = client.get("/api/v1/governance/employees", headers=headers)
    assert employee_resp.status_code == 200, employee_resp.text
    employee_id = next(e["id"] for e in employee_resp.json() if e["email"] == "deepak.sharma@delta.com")

    allocate_resp = client.post(
        "/api/v1/governance/allocations",
        json={
            "project_id": project_id,
            "employee_id": employee_id,
            "allocation_role": "developer",
            "allocation_percent": 80,
            "start_date": "2026-08-05",
            "reporting_manager_id": None,
        },
        headers=headers,
    )
    assert allocate_resp.status_code == 201, allocate_resp.text

    status_resp = client.post(
        "/api/v1/governance/status",
        json={
            "employee_id": employee_id,
            "project_id": project_id,
            "week_start": "2026-08-10",
            "status": "submitted",
            "fields": {
                "project": project_name,
                "account": account_name,
                "reportingFrequency": "Weekly",
                "overallStatus": "Green",
                "completionPercent": 61,
                "hoursWorked": 42,
                "achievements": "Delivered the treasury dashboard wireframes and integrated core risk calculations.",
                "blockers": "No blockers. Dependency on upstream market data feed remains under watch.",
                "risks": "Market data source latency may affect daily refresh windows.",
                "nextWeekPlan": "Complete reconciliation workflow and start user acceptance testing.",
                "supportRequired": "Need confirmation on final data refresh SLA from the client team.",
            },
        },
        headers=headers,
    )
    assert status_resp.status_code == 201, status_resp.text

    report_resp = client.post(
        "/api/v1/reports",
        json={
            "title": f"{project_name} Weekly Status",
            "report_type": "project_report",
            "report_format": "pptx",
            "scope": f"project:{project_id}",
            "account_id": account_id,
            "project_id": project_id,
            "status_frequency": "weekly",
            "use_celery": False,
            "llm": None,
        },
        headers=headers,
    )
    assert report_resp.status_code == 201, report_resp.text
    report = report_resp.json()
    assert report["status"] == "ready", report
    assert report["file_path"], report

    file_path = Path(report["file_path"])
    assert file_path.exists(), file_path
    assert file_path.suffix == ".pptx"


def test_trimble_finance_ai_assistant_seed_data_exists() -> None:
    get_settings.cache_clear()
    Base.metadata.create_all(bind=engine)
    seed()

    with SessionLocal() as db:
        account = db.query(Account).filter(Account.name == "Trimble").one_or_none()
        assert account is not None, "Trimble account was not seeded"

        project = db.query(Project).filter(Project.name == "Trimble Finance AI Assistant").one_or_none()
        assert project is not None, "Trimble Finance AI Assistant project was not seeded"
        assert project.account_id == account.id

        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        assert len(tasks) >= 4, "Expected multiple tasks for the Trimble project"

        weekly_statuses = db.query(WeeklyStatus).filter(WeeklyStatus.project_id == project.id).all()
        assert len(weekly_statuses) >= 4, "Expected weekly status updates for the Trimble project"

        template = db.query(ReportTemplate).filter(ReportTemplate.project_id == project.id).one_or_none()
        assert template is not None, "Expected a report template for the Trimble project"
        assert Path(template.file_path).exists(), template.file_path
