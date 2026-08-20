import json
from datetime import date
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.ai.template_analysis import TemplateStructure, analyze_template
from app.core.config import get_settings
from app.models.delivery import Account, Project
from app.models.people import Employee
from app.models.status import WeeklyStatus


class SlideMapping(BaseModel):
    slide_index: int = Field(ge=0)
    fields: dict[str, str | list[str] | None] = Field(default_factory=dict)


class PPTMapping(BaseModel):
    account_name: str | None = None
    project_name: str | None = None
    reporting_period: str | None = None
    slides: list[SlideMapping] = Field(default_factory=list)


def normalize_status_data(db: Session, projects: list[Project], statuses: list[WeeklyStatus]) -> dict:
    account_ids = {project.account_id for project in projects}
    accounts = [db.get(Account, account_id) for account_id in account_ids]
    employees = []
    weekly_statuses = []
    for status in statuses:
        employee = db.get(Employee, status.employee_id)
        project = db.get(Project, status.project_id) if status.project_id else None
        employees.append({"id": status.employee_id, "name": employee.name if employee else None, "project_id": status.project_id})
        weekly_statuses.append({"employee": employee.name if employee else None, "project": project.name if project else status.fields.get("project"), "week_start": status.week_start.isoformat(), "status": status.status.value, "fields": {key: value for key, value in status.fields.items() if key in {"overallStatus", "completionPercent", "hoursWorked", "achievements", "blockers", "risks", "nextWeekPlan", "supportRequired", "reportingFrequency", "frequency"}}})
    return {"account": {"id": next(iter(account_ids), None), "name": accounts[0].name if accounts and accounts[0] else None}, "project": [{"id": project.id, "name": project.name, "phase": project.phase.value, "health": project.health.value, "risk": project.risk.value, "completion_percent": project.completion_percent} for project in projects], "reporting_period": {"status_count": len(statuses), "start": min((row.week_start for row in statuses), default=date.today()).isoformat(), "end": max((row.week_start for row in statuses), default=date.today()).isoformat()}, "employees": employees, "weekly_statuses": weekly_statuses}


def mapping_prompt(template: TemplateStructure, status_data: dict) -> str:
    return """You are a delivery governance report mapping engine. Return only JSON matching the supplied schema. Use only factual values in the status data. Do not invent, merge, or transform numerical values. Do not change the template design or slide count. Map semantic template tokens such as PROJECT_NAME, ACCOUNT_NAME, OVERALL_STATUS, EXECUTIVE_SUMMARY, ACHIEVEMENTS, BLOCKERS, RISKS, and NEXT_STEPS to factual values. If a value is absent, return null or an empty array.\n\nTEMPLATE STRUCTURE:\n""" + template.model_dump_json() + "\n\nSTATUS DATA:\n" + json.dumps(status_data, default=str)


def map_with_gemini(template: TemplateStructure, status_data: dict) -> PPTMapping:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini API key is not configured for PPT mapping")
    if settings.gemini_default_model != "gemini-2.5-flash":
        raise RuntimeError("Gemini PPT mapping requires model gemini-2.5-flash")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    for attempt in range(2):
        try:
            response = client.models.generate_content(model="gemini-2.5-flash", contents=mapping_prompt(template, status_data), config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=PPTMapping))
            return PPTMapping.model_validate_json(response.text or "")
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            if attempt == 1:
                raise RuntimeError("Gemini returned invalid PPT mapping JSON") from exc
    raise RuntimeError("Gemini PPT mapping failed")


def map_template(path: str | Path, db: Session, projects: list[Project], statuses: list[WeeklyStatus]) -> tuple[TemplateStructure, PPTMapping]:
    template = analyze_template(path)
    mapping = map_with_gemini(template, normalize_status_data(db, projects, statuses))
    invalid_slides = [slide.slide_index for slide in mapping.slides if slide.slide_index >= template.slide_count]
    if invalid_slides:
        raise RuntimeError("Gemini mapping referenced a slide outside the uploaded template")
    return template, mapping
