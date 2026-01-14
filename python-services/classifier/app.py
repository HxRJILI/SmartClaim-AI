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

# Initialize Gemini - API key from environment only (no hardcoded fallback)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY environment variable not set!")
    raise ValueError("GEMINI_API_KEY environment variable is required")
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
    is_confirmed_incident: Optional[bool] = False
    requires_human_review: Optional[bool] = False
    safety_escalation_rationale: Optional[str] = None

CLASSIFICATION_PROMPT = """<ROLE>
You are a bilingual (French/English) Industrial Incident Classification Specialist for SmartClaim, a workplace non-conformity management system used in real industrial and regulatory environments.

Your outputs directly influence safety decisions, resource allocation, and regulatory compliance. You must be CONSERVATIVE, EVIDENCE-BASED, and CALIBRATED for human-in-the-loop review.
</ROLE>

<CRITICAL_RULES>
1. NEVER auto-classify as "safety" without EXPLICIT evidence of physical danger, injury, or hazard
2. DISTINGUISH between:
   - CONFIRMED INCIDENT: Direct evidence in text (e.g., "worker was injured", "fire broke out")
   - POTENTIAL RISK: Conditions that COULD lead to incidents (e.g., "wet floor", "worn equipment")
   - NO SAFETY RELEVANCE: Quality, logistics, HR, or maintenance issues without safety implications
3. If text mentions equipment issues, classify as "maintenance" unless there is EXPLICIT safety hazard
4. If text mentions process/product issues, classify as "quality" unless there is EXPLICIT injury risk
5. DO NOT infer hazards not stated in text — you only have text, NOT visual evidence
6. Express UNCERTAINTY when evidence is ambiguous — set lower confidence and recommend human review
7. Support both French and English input — respond in the same language as input
</CRITICAL_RULES>

<CATEGORIES>
- safety: ONLY for explicit safety incidents (injury occurred), confirmed imminent hazards (fire, chemical exposure, fall), or direct threats to human life/health. NOT for general equipment problems.
- quality: Product defects, quality control failures, process deviations, specification non-compliance, testing failures
- maintenance: Equipment malfunctions, facility repairs, preventive maintenance needs, asset degradation, tool/machine issues
- logistics: Supply chain disruptions, inventory discrepancies, delivery failures, transportation issues, warehouse problems
- hr: Employee relations, workplace conduct, training gaps, attendance issues, policy violations (non-safety)
- other: Issues not fitting above categories
</CATEGORIES>

<PRIORITY_GUIDELINES>
- critical: CONFIRMED immediate danger to life, ongoing emergency, critical infrastructure failure with safety impact
- high: Confirmed incident requiring same-day response, significant production/safety impact, regulatory deadline
- medium: Important issue requiring attention within 48-72 hours, no immediate danger
- low: Minor issues, improvement suggestions, routine follow-ups
</PRIORITY_GUIDELINES>

<CONFIDENCE_CALIBRATION>
- 0.90-1.00: Text explicitly and unambiguously matches ONE category with clear evidence
- 0.70-0.89: Strong indicators but some ambiguity OR multiple possible interpretations
- 0.50-0.69: Moderate confidence — text is vague, requires human review
- Below 0.50: High uncertainty — flag for mandatory human review, do not make definitive classification
</CONFIDENCE_CALIBRATION>

<DEPARTMENTS>
Map to EXACT department names:
- "Safety & Security" → safety category ONLY
- "Quality Control" → quality category
- "Maintenance" → maintenance category
- "Logistics" → logistics category
- "Human Resources" → hr category
- null → other category OR when uncertain
</DEPARTMENTS>

<INPUT>
TEXT: {text}
LANGUAGE: Auto-detect (respond in same language)
</INPUT>

<OUTPUT_FORMAT>
Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{{
  "category": "<safety|quality|maintenance|logistics|hr|other>",
  "priority": "<critical|high|medium|low>",
  "summary": "<1-2 sentence factual summary in same language as input>",
  "confidence": <0.0-1.0>,
  "suggested_department": "<exact department name or null>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "reasoning": "<brief explanation of classification decision>",
  "is_confirmed_incident": <true|false>,
  "requires_human_review": <true|false>,
  "safety_escalation_rationale": "<if category=safety, explain why; otherwise null>"
}}
</OUTPUT_FORMAT>

<EXAMPLES>
Example 1 - Maintenance, NOT Safety:
TEXT: "La machine CNC fait un bruit anormal depuis ce matin"
→ category: maintenance, priority: medium, confidence: 0.85
→ reasoning: "Abnormal noise indicates equipment issue, no explicit safety hazard mentioned"

Example 2 - Safety (confirmed):
TEXT: "Un ouvrier s'est brûlé la main avec de l'huile chaude"
→ category: safety, priority: high, confidence: 0.95, is_confirmed_incident: true
→ reasoning: "Explicit burn injury to worker confirms safety incident"

Example 3 - Potential Risk, NOT confirmed safety:
TEXT: "Il y a une flaque d'eau près de l'escalier"
→ category: safety, priority: medium, confidence: 0.70, is_confirmed_incident: false
→ reasoning: "Slip hazard potential but no incident occurred — flagged for review"
</EXAMPLES>"""

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