# Multimodal Evidence Aggregation Service
# ========================================
# Combines visual (LVM), textual (Classifier), and audio (Transcriber) evidence
# into a unified evidence package for final classification and SLA prediction

"""
Multimodal Evidence Aggregator

This service combines evidence from multiple sources:
- LVM: Visual analysis from images
- Classifier: Text-based classification
- Transcriber: Audio transcription analysis
- Extractor: OCR/document text

The aggregator produces a unified evidence package used by:
- Final classification engine
- Predictive SLA module
- Human review queue
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import logging
import os
import httpx
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# ENUMS & CONSTANTS
# ============================================

class EvidenceSource(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    DOCUMENT = "document"


class IssueCategory(str, Enum):
    SAFETY = "safety"
    QUALITY = "quality"
    MAINTENANCE = "maintenance"
    LOGISTICS = "logistics"
    HR = "hr"
    IT = "IT"
    LEGAL = "legal"
    FINANCE = "finance"
    OTHER = "other"
    UNKNOWN = "unknown"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Confidence weights for different modalities
MODALITY_WEIGHTS = {
    EvidenceSource.TEXT: 0.4,      # Text descriptions are primary
    EvidenceSource.IMAGE: 0.35,    # Visual evidence is highly valuable
    EvidenceSource.AUDIO: 0.15,    # Audio provides context
    EvidenceSource.DOCUMENT: 0.10, # Documents for reference
}


# ============================================
# PYDANTIC MODELS
# ============================================

class LVMEvidence(BaseModel):
    """Evidence from LVM (Vision Language Model)"""
    visual_summary: str
    detected_objects: List[str]
    scene_type: str
    potential_issue_detected: bool
    issue_hypotheses: List[Dict[str, Any]]
    visual_severity_hint: str
    image_quality: str
    requires_human_review: bool
    raw_confidence: Optional[float] = None


class TextEvidence(BaseModel):
    """Evidence from text classification"""
    category: str
    priority: str
    summary: str
    confidence: float
    suggested_department: Optional[str] = None
    keywords: List[str] = []
    reasoning: Optional[str] = None


class AudioEvidence(BaseModel):
    """Evidence from audio transcription"""
    transcription: str
    language: str
    confidence: float
    duration_seconds: float


class DocumentEvidence(BaseModel):
    """Evidence from document extraction"""
    extracted_text: str
    document_type: str
    page_count: Optional[int] = None
    has_tables: bool = False


class EvidencePackage(BaseModel):
    """Combined evidence from all sources"""
    ticket_id: Optional[str] = None
    user_id: Optional[str] = None
    
    # Individual evidence sources (optional)
    text_evidence: Optional[TextEvidence] = None
    visual_evidence: Optional[LVMEvidence] = None
    audio_evidence: Optional[AudioEvidence] = None
    document_evidence: Optional[DocumentEvidence] = None


class CategoryVote(BaseModel):
    """A vote for a category from a specific source"""
    source: EvidenceSource
    category: IssueCategory
    confidence: float
    weight: float


class AggregatedEvidence(BaseModel):
    """Final aggregated evidence output"""
    # Source tracking
    sources_used: List[EvidenceSource]
    
    # Aggregated classification
    final_category: IssueCategory
    final_priority: Priority
    category_confidence: float
    category_votes: List[CategoryVote]
    
    # Combined narrative
    unified_summary: str
    all_keywords: List[str]
    
    # Visual evidence summary
    has_visual_evidence: bool
    visual_severity: Optional[str] = None
    detected_objects: List[str] = []
    
    # Risk assessment
    requires_human_review: bool
    human_review_reasons: List[str]
    
    # SLA hints
    sla_hints: Dict[str, Any]
    
    # Metadata
    processing_time_ms: float
    aggregation_version: str = "1.0.0"


# ============================================
# AGGREGATION LOGIC
# ============================================

def map_lvm_category_to_issue(issue_type: str) -> IssueCategory:
    """Map LVM issue types to standard categories"""
    mapping = {
        "safety": IssueCategory.SAFETY,
        "maintenance": IssueCategory.MAINTENANCE,
        "quality": IssueCategory.QUALITY,
        "IT": IssueCategory.IT,
        "logistics": IssueCategory.LOGISTICS,
        "HR": IssueCategory.HR,
        "legal": IssueCategory.LEGAL,
        "finance": IssueCategory.FINANCE,
        "unknown": IssueCategory.UNKNOWN,
    }
    return mapping.get(issue_type, IssueCategory.OTHER)


def map_text_category(category: str) -> IssueCategory:
    """Map classifier categories to standard categories"""
    mapping = {
        "safety": IssueCategory.SAFETY,
        "quality": IssueCategory.QUALITY,
        "maintenance": IssueCategory.MAINTENANCE,
        "logistics": IssueCategory.LOGISTICS,
        "hr": IssueCategory.HR,
        "other": IssueCategory.OTHER,
    }
    return mapping.get(category.lower(), IssueCategory.OTHER)


def compute_priority_from_severity(severity: str) -> Priority:
    """Map visual severity to priority"""
    mapping = {
        "critical": Priority.CRITICAL,
        "high": Priority.HIGH,
        "medium": Priority.MEDIUM,
        "low": Priority.LOW,
    }
    return mapping.get(severity.lower(), Priority.MEDIUM)


def aggregate_evidence(package: EvidencePackage) -> AggregatedEvidence:
    """
    Main aggregation logic.
    
    Combines evidence from multiple sources using weighted voting
    and produces a unified evidence assessment.
    """
    import time
    start_time = time.time()
    
    sources_used: List[EvidenceSource] = []
    category_votes: List[CategoryVote] = []
    keywords: List[str] = []
    summaries: List[str] = []
    human_review_reasons: List[str] = []
    detected_objects: List[str] = []
    
    has_visual_evidence = False
    visual_severity = None
    requires_human_review = False
    
    # --- Process Text Evidence ---
    if package.text_evidence:
        sources_used.append(EvidenceSource.TEXT)
        text_ev = package.text_evidence
        
        category_votes.append(CategoryVote(
            source=EvidenceSource.TEXT,
            category=map_text_category(text_ev.category),
            confidence=text_ev.confidence,
            weight=MODALITY_WEIGHTS[EvidenceSource.TEXT]
        ))
        
        keywords.extend(text_ev.keywords)
        summaries.append(text_ev.summary)
        
        # Low confidence text triggers review
        if text_ev.confidence < 0.6:
            human_review_reasons.append("Text classification confidence below threshold")
    
    # --- Process Visual Evidence ---
    if package.visual_evidence:
        sources_used.append(EvidenceSource.IMAGE)
        vis_ev = package.visual_evidence
        has_visual_evidence = True
        visual_severity = vis_ev.visual_severity_hint
        detected_objects = vis_ev.detected_objects
        
        # Add votes from visual hypotheses
        for hyp in vis_ev.issue_hypotheses:
            category_votes.append(CategoryVote(
                source=EvidenceSource.IMAGE,
                category=map_lvm_category_to_issue(hyp.get("issue_type", "unknown")),
                confidence=hyp.get("confidence", 0.0),
                weight=MODALITY_WEIGHTS[EvidenceSource.IMAGE]
            ))
        
        summaries.append(vis_ev.visual_summary)
        
        # Check for human review triggers
        if vis_ev.requires_human_review:
            requires_human_review = True
            human_review_reasons.append("LVM flagged for human review")
        
        if vis_ev.image_quality != "clear":
            human_review_reasons.append(f"Image quality: {vis_ev.image_quality}")
        
        # Safety issues always require review
        if any(h.get("issue_type") == "safety" for h in vis_ev.issue_hypotheses):
            requires_human_review = True
            human_review_reasons.append("Potential safety issue detected")
    
    # --- Process Audio Evidence ---
    if package.audio_evidence:
        sources_used.append(EvidenceSource.AUDIO)
        audio_ev = package.audio_evidence
        summaries.append(f"Audio transcription: {audio_ev.transcription[:200]}...")
        
        if audio_ev.confidence < 0.7:
            human_review_reasons.append("Audio transcription confidence below threshold")
    
    # --- Process Document Evidence ---
    if package.document_evidence:
        sources_used.append(EvidenceSource.DOCUMENT)
        doc_ev = package.document_evidence
        summaries.append(f"Document content: {doc_ev.extracted_text[:200]}...")
    
    # --- Compute Final Category (Weighted Voting) ---
    if category_votes:
        # Calculate weighted scores per category
        category_scores: Dict[IssueCategory, float] = {}
        for vote in category_votes:
            weighted_score = vote.confidence * vote.weight
            if vote.category not in category_scores:
                category_scores[vote.category] = 0.0
            category_scores[vote.category] += weighted_score
        
        # Get winning category
        final_category = max(category_scores.keys(), key=lambda k: category_scores[k])
        category_confidence = category_scores[final_category] / sum(category_scores.values())
    else:
        final_category = IssueCategory.UNKNOWN
        category_confidence = 0.0
    
    # --- Compute Final Priority ---
    if package.text_evidence:
        text_priority = Priority(package.text_evidence.priority)
    else:
        text_priority = Priority.MEDIUM
    
    if visual_severity:
        visual_priority = compute_priority_from_severity(visual_severity)
        # Take the higher priority
        final_priority = max([text_priority, visual_priority], key=lambda p: 
            {"low": 0, "medium": 1, "high": 2, "critical": 3}[p.value])
    else:
        final_priority = text_priority
    
    # --- Low overall confidence triggers review ---
    if category_confidence < 0.5:
        requires_human_review = True
        human_review_reasons.append("Overall classification confidence below threshold")
    
    # --- Build unified summary ---
    unified_summary = " | ".join(summaries) if summaries else "No evidence provided"
    
    # --- SLA Hints for downstream prediction ---
    sla_hints = {
        "visual_severity": visual_severity,
        "has_visual_evidence": has_visual_evidence,
        "category": final_category.value,
        "priority": final_priority.value,
        "confidence": category_confidence,
        "requires_human_review": requires_human_review,
        "source_count": len(sources_used),
    }
    
    processing_time = (time.time() - start_time) * 1000
    
    return AggregatedEvidence(
        sources_used=sources_used,
        final_category=final_category,
        final_priority=final_priority,
        category_confidence=category_confidence,
        category_votes=category_votes,
        unified_summary=unified_summary[:500],  # Truncate for storage
        all_keywords=list(set(keywords)),
        has_visual_evidence=has_visual_evidence,
        visual_severity=visual_severity,
        detected_objects=detected_objects,
        requires_human_review=requires_human_review,
        human_review_reasons=list(set(human_review_reasons)),
        sla_hints=sla_hints,
        processing_time_ms=processing_time,
    )


# ============================================
# FASTAPI APP
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Multimodal Aggregator starting...")
    yield
    logger.info("Multimodal Aggregator shutting down...")


app = FastAPI(
    title="SmartClaim Multimodal Aggregator",
    description="Combines evidence from LVM, Classifier, Transcriber, and Extractor",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "multimodal-aggregator",
        "version": "1.0.0"
    }


@app.post("/aggregate", response_model=AggregatedEvidence)
async def aggregate(package: EvidencePackage):
    """
    Aggregate evidence from multiple modalities.
    
    Accepts evidence from:
    - text_evidence: From classifier service
    - visual_evidence: From LVM service
    - audio_evidence: From transcriber service
    - document_evidence: From extractor service
    
    Returns unified evidence assessment with:
    - Final category and priority
    - Confidence scores
    - Human review flags
    - SLA hints
    """
    try:
        if not any([
            package.text_evidence,
            package.visual_evidence,
            package.audio_evidence,
            package.document_evidence
        ]):
            raise HTTPException(
                status_code=400,
                detail="At least one evidence source must be provided"
            )
        
        result = aggregate_evidence(package)
        
        logger.info(
            f"Aggregation complete: {result.final_category.value} "
            f"({result.category_confidence:.2f}) from {len(result.sources_used)} sources"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Aggregation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/aggregate/quick")
async def quick_aggregate(
    text: Optional[str] = None,
    category: Optional[str] = None,
    image_url: Optional[str] = None,
):
    """
    Quick aggregation endpoint for simple cases.
    
    Automatically fetches evidence from LVM and Classifier services.
    """
    package = EvidencePackage()
    
    # Call classifier if text provided
    if text:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                classifier_url = os.getenv("CLASSIFIER_URL", "http://classifier:8001")
                response = await client.post(
                    f"{classifier_url}/classify",
                    json={"text": text}
                )
                if response.status_code == 200:
                    package.text_evidence = TextEvidence(**response.json())
        except Exception as e:
            logger.warning(f"Classifier call failed: {e}")
    
    # Call LVM if image provided
    if image_url:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                lvm_url = os.getenv("LVM_URL", "http://lvm:8005")
                response = await client.post(
                    f"{lvm_url}/analyze",
                    json={"image_url": image_url}
                )
                if response.status_code == 200:
                    package.visual_evidence = LVMEvidence(**response.json())
        except Exception as e:
            logger.warning(f"LVM call failed: {e}")
    
    # If we got category but no text evidence, create minimal text evidence
    if category and not package.text_evidence:
        package.text_evidence = TextEvidence(
            category=category,
            priority="medium",
            summary="User-provided category",
            confidence=0.8,
            keywords=[]
        )
    
    if not package.text_evidence and not package.visual_evidence:
        raise HTTPException(
            status_code=400,
            detail="No evidence could be gathered. Provide text or valid image_url."
        )
    
    return aggregate_evidence(package)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
