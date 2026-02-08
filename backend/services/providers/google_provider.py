from typing import Any, Dict, Iterable, List, Tuple

from google import genai

from services.providers import provider_store

PROVIDER_NAME = "google"
DEFAULT_TEST_MODEL = "gemini-2.5-flash-lite-latest"
DEFAULT_TEST_MESSAGE = "Reply with exactly: OK"


def mask_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 8:
        return "*" * len(api_key)
    return f"{api_key[:4]}...{api_key[-4:]}"


def get_current_api_key() -> str:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    saved_key = str(state.get("api_key") or "").strip()
    return saved_key


def get_saved_models() -> List[str]:
    state = provider_store.get_provider_state(PROVIDER_NAME)
    return provider_store.normalize_models(state.get("models"))


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
        "state": connection_state,
        "api_base_url": "",
        "models": models,
        "model_count": len(models),
        "selected_model": selected_model,
    }


def save_api_key(api_key: str) -> Dict[str, Any]:
    normalized = (api_key or "").strip()
    if not normalized:
        raise ValueError("api_key cannot be empty")

    previous = get_current_api_key()
    updates: Dict[str, Any] = {"api_key": normalized}
    if normalized != previous:
        updates.update({
            "models": [],
            "selected_model": "",
            "connection_state": "disconnected",
        })

    provider_store.update_provider_state(PROVIDER_NAME, updates)
    return get_status()


def save_config(api_key: str | None = None, api_base_url: str | None = None) -> Dict[str, Any]:
    del api_base_url  # Google AI Studio does not use custom base URL in current implementation.
    if api_key is not None:
        return save_api_key(api_key)
    return get_status()


def save_models(models: List[str], selected_model: str = "") -> Dict[str, Any]:
    provider_store.set_provider_models(PROVIDER_NAME, models, selected_model)
    return get_status()


def set_connection_state(connection_state: str) -> Dict[str, Any]:
    provider_store.set_provider_connection_state(PROVIDER_NAME, connection_state)
    return get_status()


def _normalize_model_name(value: str) -> str:
    normalized = (value or "").strip()
    if normalized.startswith("models/"):
        return normalized.split("/", 1)[1]
    return normalized


def _extract_model_name(model: Any) -> str:
    if isinstance(model, dict):
        raw_name = model.get("name") or model.get("id") or model.get("model") or ""
    else:
        raw_name = (
            getattr(model, "name", "")
            or getattr(model, "id", "")
            or getattr(model, "model", "")
        )
    return _normalize_model_name(str(raw_name))


def _extract_supported_generation_methods(model: Any) -> List[str]:
    methods: Iterable[Any] | None
    if isinstance(model, dict):
        methods = (
            model.get("supported_generation_methods")
            or model.get("supportedGenerationMethods")
        )
    else:
        methods = (
            getattr(model, "supported_generation_methods", None)
            or getattr(model, "supportedGenerationMethods", None)
        )

    if not methods:
        return []

    return [str(method).strip().lower() for method in methods if method]


def _supports_generate_content(model: Any) -> bool:
    methods = _extract_supported_generation_methods(model)
    if not methods:
        # Some SDK responses omit this field; keep these models to avoid false negatives.
        return True
    return "generatecontent" in methods or "generate_content" in methods


def list_models() -> List[str]:
    api_key = get_current_api_key()
    if not api_key:
        raise ValueError("API key is not configured.")

    client = genai.Client(api_key=api_key)
    models = client.models.list()

    seen = set()
    result: List[str] = []
    for model in models:
        if not _supports_generate_content(model):
            continue

        model_name = _extract_model_name(model)
        if not model_name:
            continue

        if model_name in seen:
            continue

        seen.add(model_name)
        result.append(model_name)

    if not result:
        raise RuntimeError("No usable models were returned by the provider.")

    return result


def validate_connection() -> Tuple[bool, str]:
    api_key = get_current_api_key()
    if not api_key:
        return False, "API key is not configured."

    try:
        model_names = list_models()
        if not model_names:
            return False, "No usable models found."
        return True, "Connection validated."
    except Exception as error:
        return False, f"Connection validation failed: {error}"


def send_test_message(model: str = "", message: str = "") -> str:
    api_key = get_current_api_key()
    if not api_key:
        raise ValueError("API key is not configured.")

    model_name = (model or "").strip() or DEFAULT_TEST_MODEL
    prompt = (message or "").strip() or DEFAULT_TEST_MESSAGE

    client = genai.Client(api_key=api_key)
    chat = client.chats.create(model=model_name)
    response = chat.send_message(prompt)
    return (response.text or "").strip()
