# python-services/classifier/app.py
"""
SmartClaim Ticket Classification Service
Uses LLM to classify tickets and generate summaries
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from google import genai
import os
import logging
from enum import Enum
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartClaim Classifier",
    description="Classify and summarize tickets using LLM",
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

class Category(str, Enum):
    SAFETY = "safety"
    QUALITY = "quality"
    MAINTENANCE = "maintenance"
    LOGISTICS = "logistics"
    HR = "hr"
    OTHER = "other"

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ClassificationRequest(BaseModel):
    text: str
    context: Optional[dict] = None
    user_id: Optional[str] = None

class ClassificationResponse(BaseModel):
    category: Category
    priority: Priority
    summary: str
    confidence: float
    suggested_department: Optional[str]
    keywords: List[str]
    reasoning: Optional[str]

CLASSIFICATION_PROMPT = """You are an expert assistant for classifying workplace non-conformities and claims.

Analyze the following report and classify it:

TEXT: {text}

Classify this into one of these categories:
- safety: Safety incidents, hazards, PPE issues, security concerns
- quality: Product defects, quality control issues, process quality
- maintenance: Equipment failures, facility issues, repairs needed
- logistics: Supply chain, inventory, delivery, transportation issues
- hr: Employee relations, workplace conduct, training needs
- other: Anything that doesn't fit above categories

Assign priority (low, medium, high, critical):
- critical: Immediate danger, critical system failure
- high: Significant impact, needs urgent attention
- medium: Important but not urgent
- low: Minor issues, improvements

Provide:
1. Category
2. Priority level
3. Brief summary (1-2 sentences)
4. Confidence score (0.0-1.0)
5. Suggested department (if applicable)
6. 3-5 keywords
7. Brief reasoning for your classification

Respond in JSON format:
{{
  "category": "category_name",
  "priority": "priority_level",
  "summary": "brief summary",
  "confidence": 0.95,
  "suggested_department": "department name or null",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "why you chose this classification"
}}
"""

@app.post("/classify", response_model=ClassificationResponse)
async def classify_ticket(request: ClassificationRequest):
    """
    Classify a ticket using LLM
    """
    try:
        logger.info(f"Classifying text for user: {request.user_id}")
        
        # Prepare the prompt
        system_context = "You are a workplace safety and quality expert."
        full_prompt = system_context + "\n\n" + CLASSIFICATION_PROMPT.format(text=request.text)
        
        # Call Gemini API
        chat = client.chats.create(model="gemini-2.5-flash")
        response = chat.send_message(full_prompt)
        
        # Parse response - extract JSON from markdown if needed
        result = response.text.strip()
        if result.startswith('```json'):
            result = result[7:]
        if result.startswith('```'):
            result = result[3:]
        if result.endswith('```'):
            result = result[:-3]
        
        classification = json.loads(result.strip())
        
        logger.info(f"Classification result: {classification['category']} - {classification['priority']}")
        
        return ClassificationResponse(**classification)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse classification response: {str(e)}")
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "classifier",
        "version": "1.0.0",
        "llm_available": bool(GEMINI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)