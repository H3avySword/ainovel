from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.providers import deepseek_provider, google_provider, openai_compatible_provider

router = APIRouter()


class GenericConnectRequest(BaseModel):
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    verify: bool = True


class GenericTestRequest(BaseModel):
    model: Optional[str] = None
    message: Optional[str] = None


def _normalize_models(raw_models: Any) -> List[str]:
    if not isinstance(raw_models, list):
        return []

    result: List[str] = []
    seen = set()
    for item in raw_models:
        model_name = str(item or "").strip()
        if not model_name or model_name in seen:
            continue
        seen.add(model_name)
        result.append(model_name)
    return result


def build_provider_response(provider_module, ok: bool, state: str, message: str):
    status = provider_module.get_status()
    models = _normalize_models(status.get("models"))
    return {
        "provider": status.get("provider"),
        "ok": ok,
        "state": state,
        "message": message,
        "configured": bool(status.get("configured")),
        "masked": status.get("masked", ""),
        "api_base_url": status.get("api_base_url", ""),
        "models": models,
        "count": len(models),
        "selected_model": str(status.get("selected_model") or ""),
    }


def handle_provider_status(provider_module):
    status = provider_module.get_status()
    configured = bool(status.get("configured"))
    state = str(status.get("state") or "disconnected")

    if not configured:
        return build_provider_response(provider_module, False, "disconnected", "API key is not configured.")

    if state == "connected":
        return build_provider_response(provider_module, True, "connected", "Connected.")

    if state == "error":
        return build_provider_response(provider_module, False, "error", "Connection failed. Click Connect to retry.")

    return build_provider_response(provider_module, True, "disconnected", "API key saved. Click Connect to validate.")


def handle_provider_models(provider_module):
    status = provider_module.get_status()
    if not status.get("configured"):
        raise HTTPException(status_code=400, detail="API key is not configured.")

    try:
        models = provider_module.list_models()
        provider_module.save_models(models, status.get("selected_model", ""))
    except ValueError as error:
        provider_module.set_connection_state("error")
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        provider_module.set_connection_state("error")
        raise HTTPException(status_code=502, detail=f"Failed to fetch models: {error}")

    return build_provider_response(provider_module, True, "connected", "Models fetched.")


def handle_provider_connect(provider_module, payload: GenericConnectRequest):
    try:
        provider_module.save_config(
            api_key=payload.api_key.strip() if payload.api_key and payload.api_key.strip() else None,
            api_base_url=payload.api_base_url.strip() if payload.api_base_url and payload.api_base_url.strip() else None,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {error}")

    status = provider_module.get_status()
    if not status.get("configured"):
        provider_module.set_connection_state("disconnected")
        return build_provider_response(provider_module, False, "disconnected", "API key is not configured.")

    if not payload.verify:
        provider_module.set_connection_state("disconnected")
        return build_provider_response(provider_module, True, "disconnected", "Configuration saved.")

    try:
        models = provider_module.list_models()
        provider_module.save_models(models, status.get("selected_model", ""))
        return build_provider_response(provider_module, True, "connected", "Connect success.")
    except Exception as error:
        provider_module.set_connection_state("error")
        return build_provider_response(provider_module, False, "error", f"Connect failed: {error}")


def handle_provider_test(provider_module, payload: GenericTestRequest):
    status = provider_module.get_status()
    if not status.get("configured"):
        raise HTTPException(status_code=400, detail="API key is not configured.")

    try:
        text = provider_module.send_test_message(
            model=payload.model or "",
            message=payload.message or "",
        )
        provider_module.set_connection_state("connected")

        saved_models = _normalize_models(status.get("models"))
        selected_model = str(payload.model or status.get("selected_model") or "").strip()
        if saved_models:
            provider_module.save_models(saved_models, selected_model)

        return {
            "provider": status.get("provider"),
            "ok": True,
            "message": "Test success.",
            "text": text,
        }
    except Exception as error:
        provider_module.set_connection_state("error")
        raise HTTPException(status_code=502, detail=f"Test message failed: {error}")


@router.get("/google/status")
def get_google_status():
    return handle_provider_status(google_provider)


@router.post("/google/connect")
def connect_google(payload: GenericConnectRequest):
    return handle_provider_connect(google_provider, payload)


@router.get("/google/models")
def get_google_models():
    return handle_provider_models(google_provider)


@router.post("/google/test")
def test_google(payload: GenericTestRequest):
    return handle_provider_test(google_provider, payload)


@router.get("/openai-compatible/status")
def get_openai_compatible_status():
    return handle_provider_status(openai_compatible_provider)


@router.post("/openai-compatible/connect")
def connect_openai_compatible(payload: GenericConnectRequest):
    return handle_provider_connect(openai_compatible_provider, payload)


@router.get("/openai-compatible/models")
def get_openai_compatible_models():
    return handle_provider_models(openai_compatible_provider)


@router.post("/openai-compatible/test")
def test_openai_compatible(payload: GenericTestRequest):
    return handle_provider_test(openai_compatible_provider, payload)


@router.get("/deepseek/status")
def get_deepseek_status():
    return handle_provider_status(deepseek_provider)


@router.post("/deepseek/connect")
def connect_deepseek(payload: GenericConnectRequest):
    return handle_provider_connect(deepseek_provider, payload)


@router.get("/deepseek/models")
def get_deepseek_models():
    return handle_provider_models(deepseek_provider)


@router.post("/deepseek/test")
def test_deepseek(payload: GenericTestRequest):
    return handle_provider_test(deepseek_provider, payload)
