
import os
from google import genai
from typing import List, Dict, Any, Optional

def get_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return genai.Client(api_key=api_key)

def generate_response(
    message: str,
    history: List[Dict[str, Any]],
    system_instruction: str,
    model_name: str = "gemini-3-flash-preview",
    temperature: float = 0.7
) -> str:
    try:
        client = get_client()
        
        # Format history for Gemini API
        chat_history = []
        for h in history:
            role = 'user' if h.role == 'user' else 'model'
            parts = []
            for p in h.parts:
                if 'text' in p:
                    parts.append({"text": p['text']})
            chat_history.append({'role': role, 'parts': parts})

        chat = client.chats.create(
            model=model_name,
            config={
                "system_instruction": system_instruction,
                "temperature": temperature,
            },
            history=chat_history
        )
        
        response = chat.send_message(message)
        return response.text
        
    except Exception as e:
        print(f"LLM Generation Error: {e}")
        return f"Error generation response: {str(e)}"
