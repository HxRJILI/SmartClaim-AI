# Predictive SLA FastAPI Service
# ============================================
# REST API for SLA prediction and breach risk assessment

"""
Predictive SLA Service API

FastAPI service exposing the hybrid SLA prediction engine.
Integrates with the SmartClaim multimodal pipeline.

Endpoints:
- POST /predict - Predict SLA for a ticket
- POST /predict/from-aggregation - Predict from aggregated evidence
- GET /health - Health check
- GET /metrics - Service metrics
"""

import os
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from sla_engine import (
    HybridSLAEngine,
    SLAInput,
    SLAPrediction,
    RiskLevel,
    Category,
    Priority,
)

# Configure logging
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ============================================
# PYDANTIC MODELS
# ============================================

class SLAFactorResponse(BaseModel):
    """A factor that influenced the prediction"""
    name: str = Field(..., description="Factor name")
    impact: str = Field(..., description="positive or negative")
    weight: float = Field(..., ge=0, le=1, description="Weight of this factor")


class SLAPredictRequest(BaseModel):
    """Request for SLA prediction"""
    category: str = Field(
        ..., 
        description="Ticket category (safety, quality, maintenance, etc.)"
    )
    priority: str = Field(
        ..., 
        description="Ticket priority (critical, high, medium, low)"
    )
    description_length: int = Field(
        default=0,
        ge=0,
        description="Length of ticket description in characters"
    )
    has_attachments: bool = Field(
        default=False,
        description="Whether ticket has file attachments"
    )
    has_visual_evidence: bool = Field(
        default=False,
        description="Whether ticket has visual evidence from LVM"
    )
    visual_severity: Optional[str] = Field(
        default=None,
        description="Visual severity hint from LVM (low, medium, high, critical)"
    )
    source_count: int = Field(
        default=1,
        ge=1,
        description="Number of evidence sources"
    )
    confidence_score: float = Field(
        default=0.8,
        ge=0,
        le=1,
        description="Classification confidence score"
    )
    requires_human_review: bool = Field(
        default=False,
        description="Whether human review is required"
    )
    department_workload: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
        description="Current department workload (0-1 scale)"
    )
    keywords: List[str] = Field(
        default=[],
        description="Keywords extracted from ticket"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "category": "safety",
                    "priority": "high",
                    "has_visual_evidence": True,
                    "visual_severity": "high",
                    "requires_human_review": True,
                    "confidence_score": 0.85
                }
            ]
        }
    }


class SLAPredictResponse(BaseModel):
    """Response from SLA prediction"""
    predicted_resolution_hours: float = Field(
        ...,
        description="Predicted resolution time in hours"
    )
    breach_probability: float = Field(
        ...,
        ge=0,
        le=1,
        description="Probability of SLA breach (0-1)"
    )
    risk_level: str = Field(
        ...,
        description="Risk level: low, medium, high, critical"
    )
    explanation: str = Field(
        ...,
        description="Human-readable explanation of the prediction"
    )
    confidence: float = Field(
        ...,
        ge=0,
        le=1,
        description="Prediction confidence (0-1)"
    )
    factors: List[SLAFactorResponse] = Field(
        ...,
        description="Factors that influenced the prediction"
    )
    sla_deadline: Optional[str] = Field(
        default=None,
        description="Calculated SLA deadline timestamp (ISO format)"
    )
    
    # Debug/transparency fields
    rule_based_hours: Optional[float] = Field(
        default=None,
        description="Rule-based engine prediction"
    )
    ml_based_hours: Optional[float] = Field(
        default=None,
        description="ML model prediction (if available)"
    )


class AggregatedEvidenceRequest(BaseModel):
    """Request using aggregated evidence from aggregator service"""
    final_category: str
    final_priority: str
    has_visual_evidence: bool = False
    visual_severity: Optional[str] = None
    requires_human_review: bool = False
    source_count: int = 1
    category_confidence: float = 0.8
    sla_hints: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    ml_model_available: bool


class MetricsResponse(BaseModel):
    """Service metrics"""
    total_predictions: int
    avg_predicted_hours: float
    avg_breach_probability: float
    predictions_by_risk: Dict[str, int]


# ============================================
# GLOBAL STATE
# ============================================

# Singleton engine and metrics
_engine: Optional[HybridSLAEngine] = None
_metrics = {
    "total_predictions": 0,
    "sum_predicted_hours": 0.0,
    "sum_breach_prob": 0.0,
    "predictions_by_risk": {"low": 0, "medium": 0, "high": 0, "critical": 0}
}


def get_engine() -> HybridSLAEngine:
    """Get or create the SLA engine"""
    global _engine
    if _engine is None:
        model_path = os.environ.get("SLA_MODEL_PATH")
        _engine = HybridSLAEngine(model_path=model_path)
    return _engine


def update_metrics(prediction: SLAPrediction):
    """Update service metrics"""
    global _metrics
    _metrics["total_predictions"] += 1
    _metrics["sum_predicted_hours"] += prediction.predicted_resolution_hours
    _metrics["sum_breach_prob"] += prediction.breach_probability
    _metrics["predictions_by_risk"][prediction.risk_level.value] += 1


# ============================================
# FASTAPI APP
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Predictive SLA Service starting...")
    # Initialize engine on startup
    get_engine()
    yield
    logger.info("Predictive SLA Service shutting down...")


app = FastAPI(
    title="SmartClaim Predictive SLA Service",
    description="Hybrid rule-based + ML SLA prediction for ticket resolution",
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

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check endpoint"""
    engine = get_engine()
    return HealthResponse(
        status="healthy",
        service="sla-predictor",
        version="1.0.0",
        ml_model_available=engine.ml_engine.is_available
    )


@app.get("/metrics", response_model=MetricsResponse, tags=["System"])
async def get_metrics():
    """Get service metrics"""
    total = _metrics["total_predictions"]
    return MetricsResponse(
        total_predictions=total,
        avg_predicted_hours=_metrics["sum_predicted_hours"] / max(1, total),
        avg_breach_probability=_metrics["sum_breach_prob"] / max(1, total),
        predictions_by_risk=_metrics["predictions_by_risk"]
    )


@app.post("/predict", response_model=SLAPredictResponse, tags=["Prediction"])
async def predict_sla(request: SLAPredictRequest):
    """
    Predict SLA for a ticket.
    
    Uses hybrid rule-based + ML approach to predict:
    - Resolution time in hours
    - Breach probability
    - Risk level
    
    Factors in visual evidence from LVM, priority, category,
    and other context to generate accurate predictions.
    """
    try:
        # Convert to SLAInput
        now = datetime.now()
        input_data = SLAInput(
            category=request.category,
            priority=request.priority,
            description_length=request.description_length,
            has_attachments=request.has_attachments,
            has_visual_evidence=request.has_visual_evidence,
            visual_severity=request.visual_severity,
            source_count=request.source_count,
            confidence_score=request.confidence_score,
            requires_human_review=request.requires_human_review,
            department_workload=request.department_workload,
            time_of_day=now.hour,
            day_of_week=now.weekday(),
            keywords=request.keywords
        )
        
        # Get prediction
        engine = get_engine()
        prediction = engine.predict(input_data)
        
        # Update metrics
        update_metrics(prediction)
        
        # Calculate deadline
        deadline = now + timedelta(hours=prediction.predicted_resolution_hours)
        
        logger.info(
            f"SLA prediction: {prediction.predicted_resolution_hours}h "
            f"(breach: {prediction.breach_probability:.1%}, risk: {prediction.risk_level.value})"
        )
        
        return SLAPredictResponse(
            predicted_resolution_hours=prediction.predicted_resolution_hours,
            breach_probability=prediction.breach_probability,
            risk_level=prediction.risk_level.value,
            explanation=prediction.explanation,
            confidence=prediction.confidence,
            factors=[
                SLAFactorResponse(
                    name=f.name,
                    impact=f.impact,
                    weight=f.weight
                ) for f in prediction.factors
            ],
            sla_deadline=deadline.isoformat(),
            rule_based_hours=prediction.rule_based_hours,
            ml_based_hours=prediction.ml_based_hours
        )
        
    except Exception as e:
        logger.error(f"SLA prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/from-aggregation", response_model=SLAPredictResponse, tags=["Prediction"])
async def predict_from_aggregation(request: AggregatedEvidenceRequest):
    """
    Predict SLA from aggregated evidence.
    
    Accepts output from the multimodal aggregator service
    and generates SLA prediction using the same format.
    """
    try:
        # Extract data from aggregation
        sla_hints = request.sla_hints or {}
        
        now = datetime.now()
        input_data = SLAInput(
            category=request.final_category,
            priority=request.final_priority,
            has_visual_evidence=request.has_visual_evidence,
            visual_severity=request.visual_severity or sla_hints.get("visual_severity"),
            source_count=request.source_count,
            confidence_score=request.category_confidence,
            requires_human_review=request.requires_human_review,
            time_of_day=now.hour,
            day_of_week=now.weekday()
        )
        
        engine = get_engine()
        prediction = engine.predict(input_data)
        update_metrics(prediction)
        
        deadline = now + timedelta(hours=prediction.predicted_resolution_hours)
        
        return SLAPredictResponse(
            predicted_resolution_hours=prediction.predicted_resolution_hours,
            breach_probability=prediction.breach_probability,
            risk_level=prediction.risk_level.value,
            explanation=prediction.explanation,
            confidence=prediction.confidence,
            factors=[
                SLAFactorResponse(
                    name=f.name,
                    impact=f.impact,
                    weight=f.weight
                ) for f in prediction.factors
            ],
            sla_deadline=deadline.isoformat(),
            rule_based_hours=prediction.rule_based_hours,
            ml_based_hours=prediction.ml_based_hours
        )
        
    except Exception as e:
        logger.error(f"SLA prediction from aggregation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/config", tags=["System"])
async def get_config():
    """Get SLA configuration (base SLAs by category)"""
    from sla_engine import CATEGORY_BASE_SLA, PRIORITY_MULTIPLIER, VISUAL_SEVERITY_MULTIPLIER
    
    return {
        "base_sla_hours": {k.value: v for k, v in CATEGORY_BASE_SLA.items()},
        "priority_multipliers": {k.value: v for k, v in PRIORITY_MULTIPLIER.items()},
        "visual_severity_multipliers": VISUAL_SEVERITY_MULTIPLIER
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8007)
