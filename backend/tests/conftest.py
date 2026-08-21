import os
import uuid
from pathlib import Path

import pytest


TEST_DATABASE = Path(__file__).resolve().parents[1] / "storage" / f"pytest-{uuid.uuid4().hex}.db"
os.environ["DATABASE_BACKEND"] = "sqlite"
os.environ["SQLITE_DATABASE"] = str(TEST_DATABASE)
os.environ["SEED_DEMO_DATA"] = "true"

from app.ai.ppt_mapping import PPTMapping
from app.ai.template_analysis import analyze_template
from app.db.schema import ensure_schema_upgrades
from app.db.seed import seed
from app.db.session import Base, engine


@pytest.fixture(scope="session", autouse=True)
def isolated_test_database():
    Base.metadata.create_all(bind=engine)
    ensure_schema_upgrades()
    seed()
    yield
    engine.dispose()
    TEST_DATABASE.unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def mocked_report_gemini_mapping(monkeypatch):
    def fake_map_template(path, *_args, **_kwargs):
        structure = analyze_template(path)
        field_names = [
            "ACCOUNT_NAME", "PROJECT_NAME", "REPORT_DATE", "OVERALL_STATUS",
            "COMPLETION", "HOURS", "EXECUTIVE_SUMMARY", "ACHIEVEMENTS",
            "BLOCKERS", "RISKS", "NEXT_WEEK_PLAN", "NEXT_STEPS", "PROJECT_METRICS",
        ]
        slides = []
        for slide in structure.slides:
            element_fields = {}
            for element in slide.elements:
                if element.type not in {"shape", "placeholder", "table_cell"}:
                    continue
                matches = [field for field in field_names if field in element.text]
                if matches:
                    element_fields[element.id] = matches
            if element_fields:
                slides.append({"slide_index": slide.slide_index, "element_fields": element_fields})
        if not slides:
            first = next(
                (element for slide in structure.slides for element in slide.elements if element.type in {"shape", "placeholder", "table_cell"}),
                None,
            )
            if first is not None:
                slide_index = int(first.id.split("_")[1])
                slides.append({"slide_index": slide_index, "element_fields": {first.id: ["PROJECT_NAME"]}})
        return structure, PPTMapping(slides=slides)

    monkeypatch.setattr("app.reports.generator.map_template", fake_map_template)
