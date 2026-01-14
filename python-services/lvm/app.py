# LVM FastAPI Service
# ============================================
# REST API for Vision Language Model analysis
# Integrates with the SmartClaim multimodal pipeline

"""
LVM Service API

FastAPI service exposing the LVM analyzer for industrial image analysis.
Designed for high concurrency and production deployment.

Endpoints:
- POST /analyze - Analyze an image
- GET /health - Health check
- GET /metrics - Service metrics
"""

import os
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl
import uvicorn

from lvm_analyzer import (
    LVMAnalyzer,
    analyze_image_with_lvm,
    encode_image_bytes_to_data_uri,
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

class ImageMetadata(BaseModel):
    """Optional metadata for image analysis context."""
    source: Optional[str] = Field(None, description="Image source identifier")
    location: Optional[str] = Field(None, description="Physical location")
    department: Optional[str] = Field(None, description="Department context")
    timestamp: Optional[str] = Field(None, description="When the image was captured")
    reported_issue: Optional[str] = Field(None, description="User-reported issue description")
    ticket_id: Optional[str] = Field(None, description="Associated ticket ID")
    user_id: Optional[str] = Field(None, description="User who submitted the image")


class AnalyzeRequest(BaseModel):
    """Request model for image analysis."""
    image_url: str = Field(
        ...,
        description="URL of the image to analyze (HTTP/HTTPS or data URI)"
    )
    metadata: Optional[ImageMetadata] = Field(
        None,
        description="Optional context about the image"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "image_url": "https://example.com/factory-image.jpg",
                    "metadata": {
                        "source": "mobile_app",
                        "location": "Factory Floor B",
                        "department": "Maintenance",
                        "reported_issue": "Strange noise from machine"
                    }
                }
            ]
        }
    }


class IssueHypothesisResponse(BaseModel):
    """Issue hypothesis in the response."""
    issue_type: str = Field(..., description="Type of potential issue")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")


class AnalyzeResponse(BaseModel):
    """Response model for image analysis."""
    visual_summary: str = Field(..., description="Factual description of visible content")
    detected_objects: List[str] = Field(..., description="List of detected objects")
    scene_type: str = Field(..., description="Type of scene detected")
    potential_issue_detected: bool = Field(..., description="Whether an issue was detected")
    issue_hypotheses: List[IssueHypothesisResponse] = Field(
        ...,
        description="List of potential issue hypotheses with confidence"
    )
    visual_severity_hint: str = Field(..., description="Severity assessment")
    image_quality: str = Field(..., description="Image quality assessment")
    requires_human_review: bool = Field(..., description="Whether human review is needed")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    model_version: str = Field(..., description="Model version used")
    raw_confidence: Optional[float] = Field(None, description="Average confidence score")
    error: Optional[str] = Field(None, description="Error message if analysis failed")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    model: str


class MetricsResponse(BaseModel):
    """Service metrics response."""
    total_calls: int
    successful_calls: int
    failed_calls: int
    average_latency_ms: float
    success_rate: float


# ============================================
# GLOBAL STATE
# ============================================

# Singleton analyzer instance for metrics tracking
_analyzer: Optional[LVMAnalyzer] = None


def get_analyzer() -> LVMAnalyzer:
    """Get or create the global analyzer instance."""
    global _analyzer
    if _analyzer is None:
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not set")
        _analyzer = LVMAnalyzer(
            api_key=api_key,
            site_url=os.environ.get("SITE_URL", "https://smartclaim.ai"),
            site_name=os.environ.get("SITE_NAME", "SmartClaim AI"),
            timeout=int(os.environ.get("LVM_TIMEOUT", "60"))
        )
    return _analyzer


# ============================================
# FASTAPI APP
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("LVM Service starting...")
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        logger.info("OpenRouter API key configured")
    else:
        logger.warning("OPENROUTER_API_KEY not set - service will fail on analyze requests")
    
    yield
    
    # Shutdown
    logger.info("LVM Service shutting down...")


app = FastAPI(
    title="SmartClaim LVM Service",
    description="Vision Language Model service for industrial image analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint.
    
    Returns service status and configuration info.
    """
    return HealthResponse(
        status="healthy",
        service="lvm",
        version="1.0.0",
        model="qwen/qwen-2.5-vl-7b-instruct:free"
    )


@app.get("/metrics", response_model=MetricsResponse, tags=["System"])
async def get_metrics():
    """
    Get service metrics.
    
    Returns call counts, latency, and success rate.
    """
    try:
        analyzer = get_analyzer()
        metrics = analyzer.get_metrics()
        return MetricsResponse(**metrics)
    except ValueError as e:
        # API key not configured
        return MetricsResponse(
            total_calls=0,
            successful_calls=0,
            failed_calls=0,
            average_latency_ms=0.0,
            success_rate=0.0
        )


@app.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_image(request: AnalyzeRequest):
    """
    Analyze an industrial image.
    
    Accepts an image URL (HTTP/HTTPS or base64 data URI) and optional metadata.
    Returns structured visual evidence for the multimodal pipeline.
    
    The response includes:
    - Visual summary of what's visible
    - Detected objects
    - Scene type classification
    - Issue hypotheses with confidence scores
    - Severity assessment
    - Whether human review is required
    
    This endpoint does NOT:
    - Classify the final department
    - Decide complaint vs non-conformity type
    - Assign SLA
    
    Those decisions are made by downstream components.
    """
    try:
        analyzer = get_analyzer()
    except ValueError as e:
        logger.error(f"Analyzer initialization failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Service not configured: OPENROUTER_API_KEY not set"
        )
    
    # Convert metadata to dict if provided
    metadata_dict = None
    if request.metadata:
        metadata_dict = request.metadata.model_dump(exclude_none=True)
    
    logger.info(f"Analyzing image: {request.image_url[:100]}...")
    
    try:
        result = analyzer.analyze_image(
            image_url=request.image_url,
            metadata=metadata_dict
        )
        
        # Convert to response model
        return AnalyzeResponse(
            visual_summary=result["visual_summary"],
            detected_objects=result["detected_objects"],
            scene_type=result["scene_type"],
            potential_issue_detected=result["potential_issue_detected"],
            issue_hypotheses=[
                IssueHypothesisResponse(**hyp)
                for hyp in result["issue_hypotheses"]
            ],
            visual_severity_hint=result["visual_severity_hint"],
            image_quality=result["image_quality"],
            requires_human_review=result["requires_human_review"],
            processing_time_ms=result["processing_time_ms"],
            model_version=result["model_version"],
            raw_confidence=result.get("raw_confidence"),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {str(e)}"
        )


@app.post("/analyze/batch", tags=["Analysis"])
async def analyze_images_batch(
    requests: List[AnalyzeRequest],
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Batch analyze multiple images.
    
    Note: This processes images sequentially to respect rate limits.
    For truly parallel processing, use multiple /analyze calls.
    
    Returns a list of results in the same order as inputs.
    """
    if len(requests) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 images per batch request"
        )
    
    try:
        analyzer = get_analyzer()
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail="Service not configured: OPENROUTER_API_KEY not set"
        )
    
    results = []
    for req in requests:
        metadata_dict = None
        if req.metadata:
            metadata_dict = req.metadata.model_dump(exclude_none=True)
        
        result = analyzer.analyze_image(
            image_url=req.image_url,
            metadata=metadata_dict
        )
        results.append(result)
    
    return {
        "results": results,
        "count": len(results)
    }


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    port = int(os.environ.get("LVM_PORT", "8005"))
    host = os.environ.get("LVM_HOST", "0.0.0.0")
    
    logger.info(f"Starting LVM Service on {host}:{port}")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=os.environ.get("LVM_DEBUG", "false").lower() == "true"
    )
