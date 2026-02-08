import sys
from typing import Iterable

from google import genai

from services.providers import google_provider


def iter_first_model_name(client: genai.Client) -> str:
    models: Iterable = client.models.list(config={"page_size": 1})
    for model in models:
        return str(getattr(model, "name", "") or "").strip()
    return ""


api_key = google_provider.get_current_api_key()
if not api_key:
    print("Critical Error: Google provider API key is not configured.")
    print("Open app settings and save API key first.")
    sys.exit(1)

print(f"API Key found: {api_key[:8]}...{api_key[-4:]}")

try:
    print("Initializing Gemini client...")
    client = genai.Client(api_key=api_key)

    print("Attempting to list models...")
    first_model_name = iter_first_model_name(client)
    if first_model_name:
        print(f"Found model: {first_model_name}")

    model_name = google_provider.get_status().get("selected_model") or "gemini-3-flash-preview"
    print(f"Creating chat with model: {model_name}")
    chat = client.chats.create(model=model_name)

    print("Sending test message...")
    response = chat.send_message("Hello")

    print("\nAPI response received:")
    print(response.text)
except Exception as error:
    print("\nAPI request failed.")
    print(f"Error details: {error}")
