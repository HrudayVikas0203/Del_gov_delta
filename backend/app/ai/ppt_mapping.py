import json
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy.orm import Session

from app.ai.gemini_response import GeminiResponseError, parse_gemini_json
from app.ai.template_analysis import TemplateStructure, analyze_template
from app.core.config import get_settings
from app.models.delivery import Account, Project
from app.models.people import Employee
from app.models.status import WeeklyStatus


ReportField = Literal[
    "ACCOUNT_NAME",
    "PROJECT_NAME",
    "REPORT_DATE",
    "OVERALL_STATUS",
    "COMPLETION",
    "HOURS",
    "EXECUTIVE_SUMMARY",
    "ACHIEVEMENTS",
    "BLOCKERS",
    "RISKS",
    "NEXT_WEEK_PLAN",
    "NEXT_STEPS",
    "PROJECT_METRICS",
]


class GeminiMappingConfigurationError(RuntimeError):
    pass


class GeminiMappingError(RuntimeError):
    pass


class GeminiMappingValidationError(GeminiMappingError):
    pass


class SlideMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slide_index: int = Field(ge=0)
    element_fields: dict[str, list[ReportField]] = Field(default_factory=dict)


class PPTMapping(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slides: list[SlideMapping] = Field(min_length=1)


def normalize_status_data(
    db: Session,
    projects: list[Project],
    statuses: list[WeeklyStatus],
    report_metadata: dict | None = None,
) -> dict:
    account_ids = {project.account_id for project in projects}
    accounts = [db.get(Account, account_id) for account_id in account_ids]
    employees = []
    weekly_statuses = []
    for status in statuses:
        employee = db.get(Employee, status.employee_id)
        project = db.get(Project, status.project_id) if status.project_id else None
        employees.append({"id": status.employee_id, "name": employee.name if employee else None, "project_id": status.project_id})
        weekly_statuses.append({"employee": employee.name if employee else None, "project": project.name if project else status.fields.get("project"), "week_start": status.week_start.isoformat(), "status": status.status.value, "fields": {key: value for key, value in status.fields.items() if key in {"overallStatus", "completionPercent", "hoursWorked", "achievements", "blockers", "risks", "nextWeekPlan", "supportRequired", "reportingFrequency", "frequency"}}})
    return {
        "report": report_metadata or {},
        "account": {"id": next(iter(account_ids), None), "name": accounts[0].name if accounts and accounts[0] else None},
        "projects": [{"id": project.id, "name": project.name, "phase": project.phase.value, "health": project.health.value, "risk": project.risk.value, "completion_percent": project.completion_percent} for project in projects],
        "reporting_period": {"status_count": len(statuses), "start": min((row.week_start for row in statuses), default=date.today()).isoformat(), "end": max((row.week_start for row in statuses), default=date.today()).isoformat()},
        "employees": employees,
        "weekly_statuses": weekly_statuses,
    }


def mapping_prompt(template: TemplateStructure, status_data: dict) -> str:
    return """You are a delivery governance PowerPoint mapping engine. Your only task is to map server-owned report fields to existing text elements in the uploaded template. Do not output report content, prose, facts, or values. Do not invent data. Do not alter slide or element identifiers. Return only structured JSON of the form {\"slides\":[{\"slide_index\":0,\"element_fields\":{\"slide_0_shape_0\":[\"PROJECT_NAME\"]}}]}. Valid field names are ACCOUNT_NAME, PROJECT_NAME, REPORT_DATE, OVERALL_STATUS, COMPLETION, HOURS, EXECUTIVE_SUMMARY, ACHIEVEMENTS, BLOCKERS, RISKS, NEXT_WEEK_PLAN, NEXT_STEPS, and PROJECT_METRICS. Use exact writable element ids from TEMPLATE STRUCTURE. Map only elements whose existing labels, tokens, placeholder purpose, or nearby structure makes the destination clear. Each mapped element must contain at least one field name. Do not redesign the template or add slides.\n\nTEMPLATE STRUCTURE:\n""" + template.model_dump_json() + "\n\nAVAILABLE REPORT DATA (context only; never copy values into the mapping):\n" + json.dumps(status_data, default=str)


def map_with_gemini(template: TemplateStructure, status_data: dict) -> PPTMapping:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise GeminiMappingConfigurationError("Gemini PPT mapping is not configured.")
    model_name = (settings.gemini_default_model or "").strip()
    if not model_name:
        raise GeminiMappingConfigurationError("Gemini PPT mapping model is not configured.")
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=mapping_prompt(template, status_data),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PPTMapping,
                temperature=0,
            ),
        )
    except Exception as exc:
        raise GeminiMappingError("Gemini PPT mapping failed.") from exc

    try:
        parsed = getattr(response, "parsed", None)
        mapping = parsed if isinstance(parsed, PPTMapping) else PPTMapping.model_validate(parsed or parse_gemini_json(response))
    except (GeminiResponseError, ValidationError, ValueError, json.JSONDecodeError) as exc:
        raise GeminiMappingValidationError("Gemini returned an invalid PPT mapping response.") from exc
    if not any(slide.element_fields for slide in mapping.slides):
        raise GeminiMappingValidationError("Gemini returned an empty PPT mapping.")
    return mapping


def map_template(
    path: str | Path,
    db: Session,
    projects: list[Project],
    statuses: list[WeeklyStatus],
    report_metadata: dict | None = None,
) -> tuple[TemplateStructure, PPTMapping]:
    template = analyze_template(path)
    mapping = map_with_gemini(template, normalize_status_data(db, projects, statuses, report_metadata))
    writable_elements = {
        element.id: (slide.slide_index, element.type)
        for slide in template.slides
        for element in slide.elements
        if element.type in {"shape", "placeholder", "table_cell"}
    }
    for slide in mapping.slides:
        if slide.slide_index >= template.slide_count:
            raise GeminiMappingValidationError("Gemini mapping referenced a slide outside the uploaded template.")
        for element_id, fields in slide.element_fields.items():
            target = writable_elements.get(element_id)
            if target is None or target[0] != slide.slide_index:
                raise GeminiMappingValidationError("Gemini mapping referenced an invalid template element.")
            if not fields:
                raise GeminiMappingValidationError("Gemini mapping contains an empty element assignment.")
    return template, mapping
