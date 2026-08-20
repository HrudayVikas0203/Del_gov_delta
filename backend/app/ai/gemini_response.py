import json
from typing import Any


class GeminiResponseError(ValueError):
    """Raised when Gemini does not provide usable text content."""


def extract_gemini_text(response: Any) -> str:
    """Extract text parts while ignoring Gemini thought signatures and metadata."""
    text_parts: list[str] = []
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            text = getattr(part, "text", None)
            if isinstance(text, str) and text.strip():
                text_parts.append(text)
    if text_parts:
        return "".join(text_parts).strip()

    legacy_text = getattr(response, "text", None)
    if isinstance(legacy_text, str) and legacy_text.strip():
        return legacy_text.strip()
    raise GeminiResponseError("Gemini response contained no text parts")


def normalize_gemini_json(text: str) -> str:
    """Remove an optional Markdown JSON fence without altering JSON content."""
    normalized = text.strip()
    if normalized.startswith("```") and normalized.endswith("```"):
        lines = normalized.splitlines()
        normalized = "\n".join(lines[1:-1]).strip()
        if normalized.lower().startswith("json\n"):
            normalized = normalized[5:].lstrip()
    return normalized


def parse_gemini_json(response: Any) -> Any:
    """Extract and decode JSON from a Gemini response with actionable errors."""
    text = extract_gemini_text(response)
    try:
        return json.loads(normalize_gemini_json(text))
    except json.JSONDecodeError as exc:
        raise GeminiResponseError(f"Gemini response was not valid JSON: {exc.msg}") from exc
