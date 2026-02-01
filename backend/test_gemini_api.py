
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
import sys

# 1. Load Environment Variables
env_path = Path(__file__).parent.parent / '.env.local'
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("❌ Critical Error: GEMINI_API_KEY not found in environment variables.")
    print("Please check e:/games/novel/longnovel/localapp/.env.local")
    sys.exit(1)

print(f"✅ API Key found: {api_key[:8]}...{api_key[-4:]}")


# 2. Check Proxy
print(f"HTTP_PROXY: {os.environ.get('HTTP_PROXY')}")
print(f"HTTPS_PROXY: {os.environ.get('HTTPS_PROXY')}")

# 3. Initialize Client
try:
    print("Initializing Gemini Client...")
    client = genai.Client(api_key=api_key)
    
    # Try listing models to check connectivity
    print("Attempting to list models...")
    for m in client.models.list(config={"page_size": 1}):
        print(f"Found model: {m.name}")
        break
    
    model_name = "gemini-3-flash-preview"
    print(f"Creating chat with model: {model_name}")
    chat = client.chats.create(model=model_name)
    
    print("Sending test message...")
    response = chat.send_message("Hello")
    
    print("\n✅ API Response Received:")
    print(response.text)

except Exception as e:
    print(f"\n❌ API Request Failed!")
    print(f"Error Details: {e}")

