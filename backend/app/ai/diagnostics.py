"""Secret-safe provider diagnostics: python -m app.ai.diagnostics."""
import logging
from pathlib import Path

from app.ai.template_analysis import analyze_template
from app.core.config import get_settings

logging.basicConfig(level=logging.WARNING)


def _failure(exc: Exception) -> str:
    return type(exc).__name__


def main() -> None:
    settings = get_settings()
    print("====================================")
    print("AI PROVIDER DIAGNOSTICS")
    print("====================================")
    print("GROQ")
    print(f"Key: {'PRESENT' if settings.groq_api_key else 'MISSING'}")
    print(f"Model: {settings.groq_default_model}")
    if settings.groq_api_key:
        try:
            from app.services.llm import generate_text
            text, _ = generate_text("groq", "Reply with exactly: OK", settings.groq_default_model)
            print("Connection: SUCCESS")
            print(f"Response: {'VALID' if text.strip() else 'INVALID'}")
        except Exception as exc:
            print("Connection: FAILED")
            print(f"Error: {_failure(exc)}")
    else:
        print("Connection: NOT_RUN")
        print("Response: NOT_RUN")

    print("GEMINI")
    print(f"Key: {'PRESENT' if settings.gemini_api_key else 'MISSING'}")
    print(f"Model: {settings.gemini_default_model}")
    if settings.gemini_api_key:
        try:
            from google import genai
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(model=settings.gemini_default_model, contents="Reply with exactly: OK")
            print("Connection: SUCCESS")
            print(f"Response: {'VALID' if (response.text or '').strip() else 'INVALID'}")
        except Exception as exc:
            print("Connection: FAILED")
            print(f"Error: {_failure(exc)}")
    else:
        print("Connection: NOT_RUN")
        print("Response: NOT_RUN")

    templates = sorted(Path(settings.templates_dir).glob("*.pptx"))
    print("PPT MAPPING")
    if templates:
        try:
            structure = analyze_template(templates[0])
            print(f"Template parsing: SUCCESS ({structure.slide_count} slides)")
        except Exception as exc:
            print("Template parsing: FAILED")
            print(f"Error: {_failure(exc)}")
    else:
        print("Template parsing: NOT_RUN (no stored PPTX template)")
    print("Gemini mapping: NOT_RUN (requires a report project/status context)")
    print("JSON validation: NOT_RUN")
    print("PPT population: NOT_RUN")
    print("Generated PPT validation: NOT_RUN")
    print("====================================")


if __name__ == "__main__":
    main()
