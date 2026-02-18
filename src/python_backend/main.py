from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import os
import argparse
import secrets
import uvicorn

# New Router Imports
from routers import short_novel, long_novel, provider
from services.llm_service import generate_response, get_default_model, normalize_provider
from services.providers import provider_registry

app = FastAPI()

# -------------------------------------------------------------------------
# Dynamic Configuration (Filled at runtime)
# -------------------------------------------------------------------------
APP_TOKEN = os.environ.get("APP_TOKEN", None)  # Can be set via CLI or Env

# -------------------------------------------------------------------------
# Middleware: Authentication
# -------------------------------------------------------------------------
@app.middleware("http")
async def verify_token(request: Request, call_next):
    # Allow public endpoints
    if request.url.path in ["/", "/api/health", "/docs", "/openapi.json"]:
        return await call_next(request)
    
    # If no token is configured (e.g. dev mode without --token), skip auth
    # Check global APP_TOKEN variable which might be set by main
    current_token = os.environ.get("APP_TOKEN")
    if not current_token:
        return await call_next(request)
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not secrets.compare_digest(auth_header, current_token):
        return Response(content="Unauthorized", status_code=403)

    return await call_next(request)

# -------------------------------------------------------------------------
# Middleware: CORS
# -------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    # Allow localhost:5173 (Vite dev) and Electron origin (if needed)
    # Note: In production Electron might not have an origin or be 'file://'
    # The Token Auth is the primary defense.
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173", 
        "app://."  # Potential electron scheme
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include New Routers
app.include_router(short_novel.router, prefix="/api/chat", tags=["Short Novel"])
app.include_router(long_novel.router, prefix="/api/chat", tags=["Long Novel"])
app.include_router(provider.router, prefix="/api/providers", tags=["Providers"])

class ChatMessage(BaseModel):
    role: str
    parts: List[Dict[str, str]]

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str
    context: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class ApiKeyUpdateRequest(BaseModel):
    provider: Optional[str] = "google"
    api_key: Optional[str] = None
    api_base_url: Optional[str] = None
    models: Optional[List[str]] = None
    selected_model: Optional[str] = None
    state: Optional[str] = None

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


def _build_legacy_provider_payload(status: Dict[str, Any]) -> Dict[str, Any]:
    models = _normalize_models(status.get("models"))
    return {
        "provider": status.get("provider"),
        "configured": bool(status.get("configured")),
        "masked": str(status.get("masked") or ""),
        "api_base_url": str(status.get("api_base_url") or ""),
        "state": str(status.get("state") or "disconnected"),
        "models": models,
        "count": len(models),
        "selected_model": str(status.get("selected_model") or ""),
    }

@app.get("/")
def read_root():
    return {"message": "Hello from Python Backend"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "env": os.environ.get("CONDA_DEFAULT_ENV", "unknown")}

@app.get("/api/config/api-key")
def get_api_key_status(provider: Optional[str] = None):
    if provider:
        try:
            provider_module = provider_registry.get_provider_module(provider)
        except KeyError as error:
            raise HTTPException(status_code=400, detail=str(error))

        return _build_legacy_provider_payload(provider_module.get_status())

    providers_payload: Dict[str, Dict[str, Any]] = {}
    for provider_name, provider_module in provider_registry.PROVIDER_MODULES.items():
        providers_payload[provider_name] = _build_legacy_provider_payload(provider_module.get_status())

    return {"providers": providers_payload}

@app.post("/api/config/api-key")
def update_api_key(payload: ApiKeyUpdateRequest):
    provider_name = payload.provider or "google"
    try:
        provider_module = provider_registry.get_provider_module(provider_name)
    except KeyError as error:
        raise HTTPException(status_code=400, detail=str(error))

    try:
        api_key = payload.api_key
        if api_key is not None:
            api_key = api_key.strip()
            if not api_key:
                raise HTTPException(status_code=400, detail="api_key cannot be empty")

        api_base_url = payload.api_base_url
        if api_base_url is not None:
            api_base_url = api_base_url.strip()
            if not api_base_url:
                api_base_url = None

        provider_module.save_config(api_key=api_key, api_base_url=api_base_url)

        if payload.models is not None:
            provider_module.save_models(payload.models, payload.selected_model or "")

        if payload.state is not None:
            state = payload.state.strip().lower()
            if state not in {"connected", "disconnected", "error"}:
                raise HTTPException(status_code=400, detail="Invalid state.")
            provider_module.set_connection_state(state)
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        print(f"[Config] Failed to update provider config: {error}")
        raise HTTPException(status_code=500, detail=f"Failed to update API key: {error}")

    status = provider_module.get_status()
    response_payload = _build_legacy_provider_payload(status)

    return {
        "text": "Provider config updated",
        **response_payload,
    }

# --- Legacy Interface (Kept as requested) ---
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # 使用新的 genai.Client API（根据官方文档）
        config = request.config or {}
        provider_name = normalize_provider(str(config.get("provider", "google")))
        model_name = str(config.get("model") or get_default_model(provider_name))
        temperature = float(config.get("temperature", 0.7))
        
        # 模型选择 - 使用官方推荐的模型名称
        system_instruction = f"""You are an expert novel writing assistant. 
        Your tone is encouraging, creative, and precise.
        You help with:
        1. Brainstorming plot points.
        2. Polishing prose.
        3. Developing character arcs.
        
        Current Context:
        {request.context if request.context else "No context provided."}
        """

        # 转换历史记录格式
        response_text = generate_response(
            message=request.message,
            history=request.history,
            system_instruction=system_instruction,
            model_name=model_name,
            temperature=temperature,
            provider_name=provider_name,
        )

        return {"text": response_text}
        
    except Exception as e:
        print(f"Backend Error: {e}")
        return {"text": f"Backend Error: {str(e)}"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Novel Backend")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--token", type=str, default=None, help="Authentication token")
    
    args = parser.parse_args()
    
    if args.token:
        os.environ["APP_TOKEN"] = args.token
        print(f"Security: Token auth enabled.")
    else:
        print(f"Security: Warning - Running without auth token.")

    print(f"Starting server on port {args.port}")
    uvicorn.run(app, host="127.0.0.1", port=args.port)
