from typing import Any, Dict, List, Tuple

from openai import OpenAI

from services.providers import provider_store

PROVIDER_NAME = "openai-compatible"
DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_TEST_MODEL = "gpt-4o-mini"
DEFAULT_TEST_MESSAGE = "Reply with exactly: OK"


def mask_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}...{api_key[-4:]}"


def _normalize_base_url(api_base_url: str) -> str:
    normalized = (api_base_url or "").strip() or DEFAULT_BASE_URL
    return normalized.rstrip("/")


def get_current_api_key() -> str:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    return str(state.get("api_key") or "").strip()


def get_current_base_url() -> str:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    saved_url = str(state.get("api_base_url") or "").strip()
    if saved_url:
        return _normalize_base_url(saved_url)
    return DEFAULT_BASE_URL


def get_saved_models() -> List[str]:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    return provider_store.normalize_models(state.get("models"))


def save_config(api_key: str | None = None, api_base_url: str | None = None) -> Dict[str, Any]:
    updates: Dict[str, Any] = {}
    state_changed = False

    if api_key is not None:
        normalized_key = api_key.strip()
        if not normalized_key:
            raise ValueError("api_key cannot be empty")

        previous_key = get_current_api_key()
        updates["api_key"] = normalized_key
        if normalized_key != previous_key:
            state_changed = True

    if api_base_url is not None:
        normalized_base_url = _normalize_base_url(api_base_url)
        previous_base_url = get_current_base_url()
        updates["api_base_url"] = normalized_base_url
        if normalized_base_url != previous_base_url:
            state_changed = True

    if state_changed:
        updates.update({
            "connection_state": "disconnected",
            "models": [],
            "selected_model": "",
        })

    if updates:
        provider_store.update_provider_state(PROVIDER_NAME, updates)

    return get_status()


def save_models(models: List[str], selected_model: str = "") -> Dict[str, Any]:
    provider_store.set_provider_models(PROVIDER_NAME, models, selected_model)
    return get_status()


def set_connection_state(connection_state: str) -> Dict[str, Any]:
    provider_store.set_provider_connection_state(PROVIDER_NAME, connection_state)
    return get_status()


def get_status() -> Dict[str, Any]:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    api_key = get_current_api_key()
    configured = bool(api_key)
    connection_state = str(state.get("connection_state") or "disconnected")
    if not configured:
        connection_state = "disconnected"

    models = get_saved_models()
    selected_model = str(state.get("selected_model") or "").strip()
    if selected_model and selected_model not in models:
        selected_model = ""

    return {
        "provider": PROVIDER_NAME,
        "configured": configured,
        "masked": mask_api_key(api_key),
        "api_base_url": get_current_base_url(),
        "state": connection_state,
        "models": models,
        "model_count": len(models),
        "selected_model": selected_model,
    }


def _get_client() -> OpenAI:
    api_key = get_current_api_key()
    if not api_key:
        raise ValueError("API key is not configured.")
    return OpenAI(api_key=api_key, base_url=get_current_base_url())


def _extract_content(raw_content: Any) -> str:
    if isinstance(raw_content, str):
        return raw_content.strip()
    if not isinstance(raw_content, list):
        return ""

    text_chunks: List[str] = []
    for item in raw_content:
        text_value = ""
        if isinstance(item, dict):
            text_value = str(item.get("text") or "").strip()
        else:
            text_value = str(getattr(item, "text", "") or "").strip()
        if text_value:
            text_chunks.append(text_value)
    return "\n".join(text_chunks).strip()


def list_models() -> List[str]:
    client = _get_client()
    items = client.models.list()
    models: List[str] = []
    seen = set()
    for item in items:
        model_id = str(getattr(item, "id", "") or "").strip()
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        models.append(model_id)

    if not models:
        raise RuntimeError("No usable models were returned by the provider.")

    return models


def validate_connection() -> Tuple[bool, str]:
    try:
        models = list_models()
        if not models:
            return False, "No usable models found."
        return True, "Connection validated."
    except Exception as error:
        return False, f"Connection validation failed: {error}"


def send_test_message(model: str = "", message: str = "") -> str:
    model_name = (model or "").strip() or DEFAULT_TEST_MODEL
    prompt = (message or "").strip() or DEFAULT_TEST_MESSAGE
    client = _get_client()

    completion = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}],
        stream=False,
    )
    choices = list(getattr(completion, "choices", []) or [])
    if not choices:
        return ""

    first_choice = choices[0]
    message_obj = getattr(first_choice, "message", None)
    if not message_obj:
        return ""

    return _extract_content(getattr(message_obj, "content", ""))
