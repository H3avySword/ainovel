
from fastapi import APIRouter
from models import ChatRequestLong
from services.llm_service import generate_response

router = APIRouter()

@router.post("/long")
async def chat_long_novel(request: ChatRequestLong):
    # Placeholder Logic for Long Novel
    # Future implementation will handle Volumes, Sections, complex characters, etc.
    
    system_instruction = "You are an expert novel writing assistant for a Long Novel (Epic). Currently under development."
    
    response_text = generate_response(
        message=request.message,
        history=request.history,
        system_instruction=system_instruction,
        model_name=request.config.get("model", "gemini-3-flash-preview") if request.config else "gemini-3-flash-preview",
        temperature=0.7
    )
    
    return {"text": response_text}
