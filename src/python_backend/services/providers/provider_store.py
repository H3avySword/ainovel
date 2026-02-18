import json
import os
import tempfile
from pathlib import Path
from threading import RLock
from typing import Any, Dict, List

STORE_PATH_ENV = "LOCALAPP_PROVIDER_STORE_PATH"
DEFAULT_STORE_PATH = Path(__file__).resolve().parents[4] / "data" / "provider_settings.json"
CONNECTION_STATES = {"connected", "disconnected", "error"}

_LOCK = RLock()


def _normalize_provider_key(provider_name: str) -> str:
    return (provider_name or "").strip().lower()


def _resolve_store_path() -> Path:
    configured = (os.environ.get(STORE_PATH_ENV) or "").strip()
    if configured:
        return Path(configured)
    return DEFAULT_STORE_PATH


def _sanitize_store_payload(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        return {"providers": {}}

    providers = payload.get("providers")
    if not isinstance(providers, dict):
        providers = {}

    sanitized: Dict[str, Dict[str, Any]] = {}
    for raw_key, raw_value in providers.items():
        key = _normalize_provider_key(str(raw_key))
        if not key or not isinstance(raw_value, dict):
            continue
        sanitized[key] = dict(raw_value)

    return {"providers": sanitized}


def _read_store_unlocked() -> Dict[str, Any]:
    path = _resolve_store_path()
    if not path.exists():
        return {"providers": {}}

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"providers": {}}

    return _sanitize_store_payload(payload)


def _write_store_unlocked(store: Dict[str, Any]) -> None:
    path = _resolve_store_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    content = json.dumps(store, ensure_ascii=False, indent=2)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=str(path.parent),
        delete=False,
    ) as tmp_file:
        tmp_file.write(content)
        temp_path = Path(tmp_file.name)

    temp_path.replace(path)


def get_provider_state(provider_name: str) -> Dict[str, Any]:
    key = _normalize_provider_key(provider_name)
    if not key:
        return {}

    with _LOCK:
        store = _read_store_unlocked()
        providers = store.get("providers") or {}
        current = providers.get(key)
        if isinstance(current, dict):
            return dict(current)
        return {}


def update_provider_state(provider_name: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    key = _normalize_provider_key(provider_name)
    if not key:
        raise ValueError("provider_name is required")

    with _LOCK:
        store = _read_store_unlocked()
        providers = store.setdefault("providers", {})

        current = providers.get(key)
        if not isinstance(current, dict):
            current = {}

        next_state = dict(current)
        for field, value in updates.items():
            if value is None:
                next_state.pop(field, None)
            else:
                next_state[field] = value

        providers[key] = next_state
        _write_store_unlocked(store)
        return dict(next_state)


def normalize_models(models: List[str] | None) -> List[str]:
    if not models:
        return []

    result: List[str] = []
    seen = set()
    for item in models:
        model_name = str(item or "").strip()
        if not model_name or model_name in seen:
            continue
        seen.add(model_name)
        result.append(model_name)
    return result


def set_provider_models(provider_name: str, models: List[str], selected_model: str = "") -> Dict[str, Any]:
    normalized_models = normalize_models(models)
    selected = (selected_model or "").strip()
    if selected and selected not in normalized_models:
        selected = ""

    updates: Dict[str, Any] = {
        "models": normalized_models,
        "connection_state": "connected" if normalized_models else "disconnected",
    }
    updates["selected_model"] = selected or (normalized_models[0] if normalized_models else "")
    return update_provider_state(provider_name, updates)


def set_provider_connection_state(provider_name: str, connection_state: str) -> Dict[str, Any]:
    normalized = (connection_state or "").strip().lower()
    if normalized not in CONNECTION_STATES:
        raise ValueError("Invalid connection state.")
    return update_provider_state(provider_name, {"connection_state": normalized})
