from pathlib import Path
from types import SimpleNamespace

from pptx import Presentation
from pptx.util import Inches

from app.ai.ppt_mapping import PPTMapping, map_with_gemini
from app.ai.template_analysis import analyze_template
from app.core.config import get_settings
from app.reports.generator import _populate_template


def _template(path: Path) -> None:
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    title = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(7), Inches(1))
    title.text = "{{PROJECT_NAME}}"
    body = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(7), Inches(2))
    body.text = "{{ACHIEVEMENTS}}"
    prs.save(path)


def test_template_analysis_extracts_structure(tmp_path):
    path = tmp_path / "account-template.pptx"
    _template(path)
    structure = analyze_template(path)
    assert structure.slide_count == 1
    assert structure.slides[0].elements[0].text == "{{PROJECT_NAME}}"
    assert structure.slide_width > 0


def test_gemini_mapping_validates_structured_response(monkeypatch, tmp_path):
    path = tmp_path / "account-template.pptx"
    _template(path)

    class FakeModels:
        def generate_content(self, **_kwargs):
            return SimpleNamespace(text='{"account_name":"Account A","project_name":"Project A1","slides":[{"slide_index":0,"fields":{"PROJECT_NAME":"Project A1","ACHIEVEMENTS":["Completed work"]}}]}')

    monkeypatch.setattr("google.genai.Client", lambda **_kwargs: SimpleNamespace(models=FakeModels()))
    monkeypatch.setattr("app.ai.ppt_mapping.get_settings", lambda: SimpleNamespace(gemini_api_key="configured", gemini_default_model="gemini-2.5-flash"))
    mapping = map_with_gemini(analyze_template(path), {"project": [{"name": "Project A1"}]})
    assert isinstance(mapping, PPTMapping)
    assert mapping.project_name == "Project A1"
    assert mapping.slides[0].fields["ACHIEVEMENTS"] == ["Completed work"]


def test_shape_targeted_mapping_populates_all_status_fields(tmp_path):
    path = tmp_path / "labelled-account-template.pptx"
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    fields = [
        "ACCOUNT_NAME", "PROJECT_NAME", "OVERALL_STATUS", "COMPLETION",
        "HOURS", "ACHIEVEMENTS", "BLOCKERS", "RISKS", "NEXT_WEEK_PLAN",
    ]
    for index, field in enumerate(fields):
        box = slide.shapes.add_textbox(Inches(1), Inches(0.4 + index * 0.5), Inches(8), Inches(0.35))
        box.text = field
    prs.save(path)

    structure = analyze_template(path)
    element_fields = {
        element.id: {fields[index]: fields[index]}
        for index, element in enumerate(structure.slides[0].elements)
    }
    mapping = PPTMapping(slides=[{"slide_index": 0, "element_fields": element_fields}])
    values = {
        "ACCOUNT_NAME": "Arbitrary Account",
        "PROJECT_NAME": "Arbitrary Project",
        "OVERALL_STATUS": "Amber",
        "COMPLETION": "73%",
        "HOURS": "41",
        "ACHIEVEMENTS": "Completed integration testing",
        "BLOCKERS": "Waiting for upstream approval",
        "RISKS": "Approval delay may affect release",
        "NEXT_WEEK_PLAN": "Start user acceptance testing",
    }

    populated = Presentation(str(path))
    assert _populate_template(populated, values, mapping)
    output = tmp_path / "populated.pptx"
    populated.save(output)

    reopened = Presentation(str(output))
    text = "\n".join(shape.text for slide in reopened.slides for shape in slide.shapes if getattr(shape, "text", ""))
    for value in values.values():
        assert value in text


def test_gemini_mapping_requires_exact_model(monkeypatch):
    monkeypatch.setattr("app.ai.ppt_mapping.get_settings", lambda: SimpleNamespace(gemini_api_key="configured", gemini_default_model="wrong-model"))
    try:
        map_with_gemini(SimpleNamespace(model_dump_json=lambda: "{}"), {})
    except RuntimeError as exc:
        assert "gemini-2.5-flash" in str(exc)
    else:
        raise AssertionError("Expected exact Gemini model validation")
