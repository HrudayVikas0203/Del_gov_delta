from pathlib import Path
from types import SimpleNamespace

from pptx import Presentation
from pptx.util import Inches

from app.ai.ppt_mapping import PPTMapping, map_with_gemini
from app.ai.template_analysis import analyze_template
from app.core.config import get_settings


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


def test_gemini_mapping_requires_exact_model(monkeypatch):
    monkeypatch.setattr("app.ai.ppt_mapping.get_settings", lambda: SimpleNamespace(gemini_api_key="configured", gemini_default_model="wrong-model"))
    try:
        map_with_gemini(SimpleNamespace(model_dump_json=lambda: "{}"), {})
    except RuntimeError as exc:
        assert "gemini-2.5-flash" in str(exc)
    else:
        raise AssertionError("Expected exact Gemini model validation")
