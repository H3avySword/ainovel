import logging
from typing import Any, Dict, List

from google import genai
from openai import OpenAI

from services.providers import (
    deepseek_provider,
    google_provider,
    openai_compatible_provider,
)

DEFAULT_MODELS = {
    "google": "gemini-3-flash-preview",
    "openai-compatible": "gpt-4o-mini",
    "deepseek": "deepseek-chat",
}
logger = logging.getLogger("uvicorn.error")


def normalize_provider(provider_name: str) -> str:
    normalized = (provider_name or "google").strip().lower()
    alias_map = {
        "openai": "openai-compatible",
        "openai_compatible": "openai-compatible",
        "openai-compatible": "openai-compatible",
        "deepseek": "deepseek",
        "google": "google",
        "google-ai-studio": "google",
    }
    return alias_map.get(normalized, normalized)


def get_default_model(provider_name: str) -> str:
    normalized = normalize_provider(provider_name)
    return DEFAULT_MODELS.get(normalized, DEFAULT_MODELS["google"])


def infer_model_type(model_name: str) -> str:
    normalized = (model_name or "").strip().lower()
    if not normalized:
        return "unknown"
    if normalized.startswith("gemini"):
        return "gemini"
    if normalized.startswith("gpt"):
        return "gpt"
    if normalized.startswith("deepseek"):
        return "deepseek"
    if "/" in normalized:
        return normalized.split("/", 1)[0]
    return normalized.split("-", 1)[0]


def _extract_role(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("role") or "")
    return str(getattr(item, "role", "") or "")


def _extract_parts(item: Any) -> List[Any]:
    if isinstance(item, dict):
        parts = item.get("parts") or []
    else:
        parts = getattr(item, "parts", []) or []
    return list(parts) if isinstance(parts, list) else []


def _extract_text(part: Any) -> str:
    if isinstance(part, dict):
        return str(part.get("text") or "")
    return str(getattr(part, "text", "") or "")


def _format_history_for_google(history: List[Any]) -> List[Dict[str, Any]]:
    chat_history: List[Dict[str, Any]] = []

    for item in history:
        role = "user" if _extract_role(item) == "user" else "model"
        parts_payload: List[Dict[str, str]] = []
        for part in _extract_parts(item):
            text = _extract_text(part).strip()
            if text:
                parts_payload.append({"text": text})
        if parts_payload:
            chat_history.append({"role": role, "parts": parts_payload})

    return chat_history


def _format_history_for_openai(history: List[Any]) -> List[Dict[str, str]]:
    messages: List[Dict[str, str]] = []
    for item in history:
        source_role = _extract_role(item).strip().lower()
        if source_role in {"assistant", "model"}:
            role = "assistant"
        elif source_role == "system":
            role = "system"
        elif source_role == "developer":
            role = "developer"
        else:
            role = "user"

        text_parts: List[str] = []
        for part in _extract_parts(item):
            text = _extract_text(part).strip()
            if text:
                text_parts.append(text)
        if text_parts:
            messages.append({"role": role, "content": "\n".join(text_parts)})
    return messages


def _extract_openai_content(raw_content: Any) -> str:
    if isinstance(raw_content, str):
        return raw_content.strip()
    if not isinstance(raw_content, list):
        return ""

    text_chunks: List[str] = []
    for block in raw_content:
        if isinstance(block, dict):
            text_value = str(block.get("text") or "").strip()
        else:
            text_value = str(getattr(block, "text", "") or "").strip()
        if text_value:
            text_chunks.append(text_value)
    return "\n".join(text_chunks).strip()


def _generate_google_response(
    message: str,
    history: List[Any],
    system_instruction: str,
    model_name: str,
    temperature: float,
) -> str:
    api_key = google_provider.get_current_api_key()
    if not api_key:
        raise ValueError("API key is not configured for provider: google")

    logger.info(
        "LLM request transport=google-genai provider=%s model=%s model_type=%s",
        "google",
        model_name,
        infer_model_type(model_name),
    )

    client = genai.Client(api_key=api_key)
    chat = client.chats.create(
        model=model_name,
        config={
            "system_instruction": system_instruction,
            "temperature": temperature,
        },
        history=_format_history_for_google(history),
    )
    response = chat.send_message(message)
    return (response.text or "").strip()


def _generate_openai_style_response(
    provider_name: str,
    message: str,
    history: List[Any],
    system_instruction: str,
    model_name: str,
    temperature: float,
) -> str:
    normalized_provider = normalize_provider(provider_name)
    if normalized_provider == "deepseek":
        api_key = deepseek_provider.get_current_api_key()
        base_url = deepseek_provider.get_current_base_url()
    else:
        api_key = openai_compatible_provider.get_current_api_key()
        base_url = openai_compatible_provider.get_current_base_url()

    if not api_key:
        raise ValueError(f"API key is not configured for provider: {normalized_provider}")

    logger.info(
        "LLM request transport=openai-compatible provider=%s model=%s model_type=%s base_url=%s",
        normalized_provider,
        model_name,
        infer_model_type(model_name),
        base_url,
    )

    messages = [{"role": "system", "content": system_instruction}]
    messages.extend(_format_history_for_openai(history))
    messages.append({"role": "user", "content": message})

    client = OpenAI(api_key=api_key, base_url=base_url)
    completion = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=temperature,
        stream=False,
    )
    choices = list(getattr(completion, "choices", []) or [])
    if not choices:
        return ""

    first_choice = choices[0]
    message_obj = getattr(first_choice, "message", None)
    if not message_obj:
        return ""

    return _extract_openai_content(getattr(message_obj, "content", ""))


def generate_response(
    message: str,
    history: List[Any],
    system_instruction: str,
    model_name: str = "",
    temperature: float = 0.7,
    provider_name: str = "google",
) -> str:
    try:
        normalized_provider = normalize_provider(provider_name)
        target_model = (model_name or "").strip() or get_default_model(normalized_provider)

        logger.info(
            "LLM request start provider=%s model=%s model_type=%s temperature=%.2f history_count=%d",
            normalized_provider,
            target_model,
            infer_model_type(target_model),
            temperature,
            len(history or []),
        )

        if normalized_provider == "google":
            response_text = _generate_google_response(
                message=message,
                history=history,
                system_instruction=system_instruction,
                model_name=target_model,
                temperature=temperature,
            )
            logger.info(
                "LLM request success provider=%s model=%s model_type=%s output_chars=%d",
                normalized_provider,
                target_model,
                infer_model_type(target_model),
                len(response_text or ""),
            )
            return response_text

        if normalized_provider in {"openai-compatible", "deepseek"}:
            response_text = _generate_openai_style_response(
                provider_name=normalized_provider,
                message=message,
                history=history,
                system_instruction=system_instruction,
                model_name=target_model,
                temperature=temperature,
            )
            logger.info(
                "LLM request success provider=%s model=%s model_type=%s output_chars=%d",
                normalized_provider,
                target_model,
                infer_model_type(target_model),
                len(response_text or ""),
            )
            return response_text

        raise ValueError(f"Unsupported provider: {provider_name}")
    except Exception as error:
        logger.exception(
            "LLM request failed provider=%s model=%s model_type=%s error=%s",
            normalize_provider(provider_name),
            model_name,
            infer_model_type(model_name),
            error,
        )
        return f"Error generation response: {error}"
