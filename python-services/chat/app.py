# python-services/chat/app.py
"""
SmartClaim RAG-powered Chat Assistant
Provides context-aware assistance using Gemini AI with Multi-tenant RAG
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from google import genai
import httpx
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartClaim Chat Assistant",
    description="RAG-powered chatbot for SmartClaim using Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini - API key from environment only (no hardcoded fallback)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set!")
    raise ValueError("GEMINI_API_KEY environment variable is required")
client = genai.Client(api_key=GEMINI_API_KEY)

# RAG Service URL
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag:8004")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    user_id: str
    user_role: Optional[str] = "worker"
    department_id: Optional[str] = None
    history: Optional[List[Message]] = []
    use_rag: Optional[bool] = True  # Enable RAG by default

class ChatResponse(BaseModel):
    message: str
    sources: List[Dict] = []
    confidence: float = 1.0

SYSTEM_PROMPTS = {
    "worker": """You are a helpful assistant for SmartClaim, a workplace claims management system.
You help workers:
- Submit non-conformities and claims
- Check ticket status
- Understand company policies
- Get guidance on reporting procedures

Be friendly, concise, and professional.""",
    
    "department_manager": """You are a helpful assistant for department managers in SmartClaim.
You help managers:
- Review and analyze department tickets
- Understand performance metrics
- Assign tickets to team members
- Track SLA compliance
- Generate reports

Provide data-driven insights and actionable recommendations.""",
    
    "admin": """You are a helpful assistant for SmartClaim administrators.
You help admins:
- Monitor system-wide performance
- Analyze trends across departments
- Configure system settings
- Manage users and departments
- Access advanced analytics

Provide strategic insights and system optimization recommendations."""
}

async def query_rag_service(
    query: str,
    user_id: str,
    user_role: str,
    department_id: Optional[str] = None
) -> Dict:
    """
    Query the RAG service for relevant context with multi-tenant filtering
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{RAG_SERVICE_URL}/query",
                json={
                    "query": query,
                    "user_context": {
                        "user_id": user_id,
                        "role": user_role,
                        "department_id": department_id
                    },
                    "include_sources": True,
                    "rerank": True
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"RAG service error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        logger.error(f"Error querying RAG service: {str(e)}")
        return None

async def get_relevant_context(query: str, user_role: str, department_id: Optional[str] = None):
    """
    Retrieve relevant context from vector database (legacy method)
    """
    try:
        # This is now a fallback - primary RAG is through query_rag_service
        logger.info(f"Retrieving context for query: {query[:50]}...")
        return []
    except Exception as e:
        logger.error(f"Error retrieving context: {str(e)}")
        return []

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process chat message with Gemini AI and Multi-tenant RAG
    """
    try:
        logger.info(f"Chat request from user {request.user_id} (role: {request.user_role})")
        
        rag_response = None
        context = ""
        sources = []
        
        # Try to get context from RAG service (with multi-tenant filtering)
        if request.use_rag:
            rag_response = await query_rag_service(
                query=request.message,
                user_id=request.user_id,
                user_role=request.user_role,
                department_id=request.department_id
            )
            
            if rag_response and rag_response.get("context_used"):
                # RAG service already generated a response with context
                logger.info(f"Using RAG response with {rag_response.get('num_chunks_retrieved', 0)} chunks")
                return ChatResponse(
                    message=rag_response.get("answer", ""),
                    sources=rag_response.get("sources", []),
                    confidence=0.95 if rag_response.get("sources") else 0.85
                )
            elif rag_response:
                # RAG found no context, but provided a response
                sources = rag_response.get("sources", [])
        
        # Fallback to direct Gemini call if RAG is disabled or no context found
        system_prompt = SYSTEM_PROMPTS.get(request.user_role, SYSTEM_PROMPTS["worker"])
        
        # Prepare conversation history
        conversation_history = ""
        for msg in request.history[-10:]:  # Last 10 messages
            role_label = "User" if msg.role == "user" else "Assistant"
            conversation_history += f"{role_label}: {msg.content}\n"
        
        # Build complete prompt
        history_section = f"Conversation history:\n{conversation_history}\n" if conversation_history else ""
        
        full_prompt = f"{system_prompt}\n\n{history_section}User: {request.message}\nAssistant:"
        
        # Call Gemini API directly
        chat_session = client.chats.create(model="gemini-2.5-flash")
        response = chat_session.send_message(full_prompt)
        
        assistant_message = response.text
        
        logger.info(f"Generated response for user {request.user_id}")
        
        return ChatResponse(
            message=assistant_message,
            sources=sources,
            confidence=0.7  # Lower confidence without RAG context
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check RAG service availability
    rag_status = "unknown"
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            response = await http_client.get(f"{RAG_SERVICE_URL}/health")
            rag_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        rag_status = "unavailable"
    
    return {
        "status": "healthy",
        "service": "chat-assistant",
        "version": "1.0.0",
        "llm_available": bool(GEMINI_API_KEY),
        "rag_service": rag_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
