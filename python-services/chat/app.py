# python-services/chat/app.py
"""
SmartClaim RAG-powered Chat Assistant
Provides context-aware assistance using Gemini AI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from google import genai
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

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBkuu6HZHTrMqtni0rsqepjhyyppu5Oh1U")
client = genai.Client(api_key=GEMINI_API_KEY)

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    user_id: str
    user_role: Optional[str] = "worker"
    department_id: Optional[str] = None
    history: Optional[List[Message]] = []

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

async def get_relevant_context(query: str, user_role: str, department_id: Optional[str] = None):
    """
    Retrieve relevant context from vector database
    """
    try:
        # TODO: Implement vector database query to Supabase pgvector
        # For now, return placeholder
        logger.info(f"Retrieving context for query: {query[:50]}...")
        
        # This would query your Supabase pgvector database
        # Example pseudo-code:
        # results = await supabase.rpc('match_documents', {
        #     'query_embedding': embedding,
        #     'match_count': 5,
        #     'filter': {'department_id': department_id} if department_id else {}
        # })
        
        return []
    except Exception as e:
        logger.error(f"Error retrieving context: {str(e)}")
        return []

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process chat message with Gemini AI
    """
    try:
        logger.info(f"Chat request from user {request.user_id} (role: {request.user_role})")
        
        # Get relevant context from vector database
        context_docs = await get_relevant_context(
            request.message,
            request.user_role,
            request.department_id
        )
        
        # Build context string
        context = "\n\n".join([doc.get("content", "") for doc in context_docs[:3]])
        
        # Build prompt for Gemini
        system_prompt = SYSTEM_PROMPTS.get(request.user_role, SYSTEM_PROMPTS["worker"])
        
        # Prepare conversation history
        conversation_history = ""
        for msg in request.history[-10:]:  # Last 10 messages
            role_label = "User" if msg.role == "user" else "Assistant"
            conversation_history += f"{role_label}: {msg.content}\n"
        
        # Build complete prompt
        context_section = f"Relevant context from knowledge base:\n{context}\n" if context else ""
        history_section = f"Conversation history:\n{conversation_history}\n" if conversation_history else ""
        
        full_prompt = f"{system_prompt}\n\n{context_section}{history_section}User: {request.message}\nAssistant:"
        
        # Call Gemini API
        chat = client.chats.create(model="gemini-2.5-flash")
        response = chat.send_message(full_prompt)
        
        assistant_message = response.text
        
        logger.info(f"Generated response for user {request.user_id}")
        
        return ChatResponse(
            message=assistant_message,
            sources=[{"id": doc.get("id"), "title": doc.get("title")} for doc in context_docs],
            confidence=0.9 if context_docs else 0.7
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "chat-assistant",
        "version": "1.0.0",
        "llm_available": bool(GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
