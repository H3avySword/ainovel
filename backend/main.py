from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import argparse
import secrets
from pathlib import Path
from dotenv import load_dotenv
from google import genai
import uvicorn

# New Router Imports
from routers import short_novel, long_novel

# 加载 .env.local 文件（位于 backend 的父目录）
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

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

class ChatMessage(BaseModel):
    role: str
    parts: List[Dict[str, str]]

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str
    context: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

@app.get("/")
def read_root():
    return {"message": "Hello from Python Backend"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "env": os.environ.get("CONDA_DEFAULT_ENV", "unknown")}

# --- Legacy Interface (Kept as requested) ---
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment")
        return {"text": "Error: API Key not configured in backend."}
    
    try:
        # 使用新的 genai.Client API（根据官方文档）
        client = genai.Client(api_key=api_key)
        
        # 模型选择 - 使用官方推荐的模型名称
        model_name = "gemini-3-flash-preview"
        if request.config and "model" in request.config:
            model_name = request.config["model"]
            
        temperature = 0.7
        if request.config and "temperature" in request.config:
            temperature = request.config["temperature"]

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
        chat_history = []
        for h in request.history:
            # Frontend: 'user'/'model' 或 'user'/'assistant'
            # Google API: 'user'/'model'
            role = 'user' if h.role == 'user' else 'model'
            
            parts = []
            for p in h.parts:
                if 'text' in p:
                    parts.append({"text": p['text']})
            
            chat_history.append({'role': role, 'parts': parts})

        # 使用 chats.create 创建对话
        chat = client.chats.create(
            model=model_name,
            config={
                "system_instruction": system_instruction,
                "temperature": temperature,
            },
            history=chat_history
        )
        
        # 发送消息并获取回复
        response = chat.send_message(request.message)
        
        return {"text": response.text}
        
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
