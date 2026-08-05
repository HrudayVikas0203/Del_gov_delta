from dataclasses import dataclass
import logging

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMProvider:
    name: str
    display_name: str
    default_model: str
    configured: bool
    models: list[str]


def available_providers() -> list[LLMProvider]:
    settings = get_settings()
    return [
        LLMProvider("openai", "OpenAI", settings.openai_default_model, bool(settings.openai_api_key), [settings.openai_default_model, "gpt-4.1", "gpt-4o-mini"]),
        LLMProvider("groq", "Groq", settings.groq_default_model, bool(settings.groq_api_key), [settings.groq_default_model, "llama-3.1-8b-instant"]),
        LLMProvider("gemini", "Gemini", settings.gemini_default_model, bool(settings.gemini_api_key), [settings.gemini_default_model, "gemini-1.5-flash"]),
        LLMProvider("claude", "Claude", settings.claude_default_model, bool(settings.anthropic_api_key), [settings.claude_default_model, "claude-3-5-haiku-latest"]),
    ]


def require_provider(provider_name: str) -> LLMProvider:
    for provider in available_providers():
        if provider.name == provider_name:
            if not provider.configured:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{provider.display_name} API key is not configured")
            return provider
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported LLM provider")


def _messages(prompt: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are a senior delivery governance analyst. Write concise, executive-ready "
                "content for delivery status reports. Use professional language, avoid filler, "
                "and make risks, recommendations, dependencies, and decisions clear."
            ),
        },
        {"role": "user", "content": prompt},
    ]


def generate_text(provider_name: str, prompt: str, model: str | None = None) -> tuple[str, str]:
    settings = get_settings()
    provider = require_provider(provider_name)
    model_name = model or provider.default_model

    try:
        if provider.name == "openai":
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key, http_client=httpx.Client(timeout=25.0, trust_env=False), max_retries=2)
            response = client.chat.completions.create(model=model_name, messages=_messages(prompt), temperature=0.2, max_tokens=1200)
            return response.choices[0].message.content or "", model_name
        if provider.name == "groq":
            from groq import Groq

            client = Groq(api_key=settings.groq_api_key, http_client=httpx.Client(timeout=25.0, trust_env=False), max_retries=2)
            response = client.chat.completions.create(model=model_name, messages=_messages(prompt), temperature=0.2, max_tokens=1200)
            return response.choices[0].message.content or "", model_name
        if provider.name == "gemini":
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            response = genai.GenerativeModel(model_name).generate_content(prompt)
            return response.text or "", model_name
        if provider.name == "claude":
            from anthropic import Anthropic

            client = Anthropic(api_key=settings.anthropic_api_key, http_client=httpx.Client(timeout=25.0, trust_env=False), max_retries=2)
            response = client.messages.create(model=model_name, max_tokens=1200, temperature=0.2, messages=[{"role": "user", "content": prompt}])
            return "\n".join(block.text for block in response.content if getattr(block, "type", None) == "text"), model_name
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("LLM provider call failed for %s/%s", provider.name, model_name)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{provider.display_name} generation failed. Check API key, model name, network access, and provider limits.",
        ) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported LLM provider")


