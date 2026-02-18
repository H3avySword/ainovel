
from fastapi import APIRouter
from models import ChatRequestLong
from services.llm_service import generate_response, get_default_model, normalize_provider

router = APIRouter()

@router.post("/long")
async def chat_long_novel(request: ChatRequestLong):
    # Placeholder Logic for Long Novel
    # Future implementation will handle Volumes, Sections, complex characters, etc.
    
    system_instruction = "You are an expert novel writing assistant for a Long Novel (Epic). Currently under development."

    config = request.config or {}
    provider_name = normalize_provider(str(config.get("provider", "google")))
    model_name = str(config.get("model") or get_default_model(provider_name))
    temperature = float(config.get("temperature", 0.7))
    
    response_text = generate_response(
        message=request.message,
        history=request.history,
        system_instruction=system_instruction,
        model_name=model_name,
        temperature=temperature,
        provider_name=provider_name,
    )
    
    return {"text": response_text}
