# LVM (Vision Language Model) Service
# ============================================
# Uses Qwen 2.5 VL 7B via OpenRouter for industrial image analysis
# Produces structured visual evidence for the multimodal pipeline

"""
LVM Service for SmartClaim AI

This module implements the Vision Language Model layer using Qwen 2.5 VL 7B
via OpenRouter API. It analyzes industrial images and produces structured
JSON output for downstream components (LLM, SLA engine, workflow).

INTEGRATION CONTRACT:
- Input: Image URL + optional metadata
- Output: Structured visual evidence JSON
- Does NOT: Classify department, decide complaint type, assign SLA

The output feeds into the multimodal evidence aggregation layer.
"""

import requests
import json
import logging
import time
import base64
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, asdict
from enum import Enum
from functools import wraps
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================
# ENUMS & TYPE DEFINITIONS
# ============================================

class SceneType(str, Enum):
    """Types of industrial/workplace scenes."""
    FACTORY_FLOOR = "factory_floor"
    WAREHOUSE = "warehouse"
    OFFICE = "office"
    OUTDOOR_INDUSTRIAL = "outdoor_industrial"
    LABORATORY = "laboratory"
    LOADING_DOCK = "loading_dock"
    MACHINE_SHOP = "machine_shop"
    ELECTRICAL_ROOM = "electrical_room"
    CHEMICAL_STORAGE = "chemical_storage"
    CONSTRUCTION_SITE = "construction_site"
    VEHICLE_FLEET = "vehicle_fleet"
    TRANSPORT = "transport"
    UNKNOWN = "unknown"


class IssueType(str, Enum):
    """Visual evidence-based issue types (NOT classification categories)."""
    SPILL = "spill"
    DAMAGE = "damage"
    OBSTRUCTION = "obstruction"
    MISSING_SAFETY_EQUIPMENT = "missing_safety_equipment"
    WEAR = "wear"
    CONTAMINATION = "contamination"
    DISORGANIZATION = "disorganization"
    ELECTRICAL_HAZARD = "electrical_hazard"
    FIRE_RISK = "fire_risk"
    ERGONOMIC_CONCERN = "ergonomic_concern"
    LEAK = "leak"
    STRUCTURAL = "structural"
    UNKNOWN = "unknown"


class SeverityHint(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ImageQuality(str, Enum):
    CLEAR = "clear"
    ACCEPTABLE = "acceptable"
    BLURRY = "blurry"
    DARK = "dark"
    OVEREXPOSED = "overexposed"
    OBSTRUCTED = "obstructed"
    PARTIAL = "partial"


# ============================================
# OUTPUT SCHEMA DEFINITIONS
# ============================================

@dataclass
class IssueHypothesis:
    """Single issue hypothesis with confidence score."""
    issue_type: str  # IssueType value
    confidence: float  # 0.0 to 1.0


@dataclass
class LVMOutput:
    """
    Structured output from LVM analysis.
    
    This schema is the integration contract with downstream systems.
    All fields must be populated; use 'unknown' for uncertain values.
    """
    visual_summary: str
    confirmed_observations: List[str]  # Clearly visible objects/conditions
    ambiguous_observations: List[str]  # Possibly present but uncertain
    detected_objects: List[str]
    scene_type: str  # SceneType value
    potential_issue_detected: bool
    issue_hypotheses: List[Dict[str, Any]]  # List of {issue_type, confidence, visual_evidence}
    visual_severity_hint: str  # SeverityHint value
    image_quality: str  # ImageQuality value
    requires_human_review: bool
    review_reasons: List[str]  # Specific reasons for human review
    analysis_limitations: str  # Constraints on analysis
    
    # Metadata fields (not part of core schema but useful for debugging)
    processing_time_ms: Optional[float] = None
    model_version: str = "qwen/qwen-2.5-vl-7b-instruct:free"
    raw_confidence: Optional[float] = None


# ============================================
# SYSTEM PROMPT - INDUSTRIAL REASONING
# ============================================

SYSTEM_PROMPT = """<ROLE>
You are an Industrial Visual Evidence Extraction System for SmartClaim.

Your ONLY function is to extract OBJECTIVE VISUAL EVIDENCE from industrial/workplace images. You feed downstream classification systems — you do NOT classify incidents, diagnose root causes, or assign blame.
</ROLE>

<CRITICAL_CONSTRAINTS>
1. DESCRIBE ONLY WHAT IS DIRECTLY VISIBLE — never infer what is not shown
2. DO NOT:
   - Assign cause, intent, or blame
   - Diagnose equipment failures (describe visible symptoms only)
   - Conclude incident severity (provide visual hints only for downstream systems)
   - Hallucinate objects, people, or conditions not clearly visible
   - Make final safety determinations (that is the LLM classifier's job)
3. USE HEDGED LANGUAGE for ambiguous observations:
   - "appears to be" / "semble être"
   - "possibly" / "possiblement"  
   - "visible marking consistent with" / "marque visible compatible avec"
4. CLEARLY SEPARATE:
   - CONFIRMED: Objects/conditions clearly and unambiguously visible
   - AMBIGUOUS: Things that might be present but image quality or angle prevents certainty
5. If image quality prevents reliable analysis, explicitly state limitations and request human review
6. Support bilingual output (FR/EN) — match language of any provided context
</CRITICAL_CONSTRAINTS>

<SCENE_TYPES>
factory_floor, warehouse, office, outdoor_industrial, laboratory, 
loading_dock, machine_shop, electrical_room, chemical_storage, 
construction_site, vehicle_fleet, transport, unknown
</SCENE_TYPES>

<ISSUE_TYPES_FOR_HYPOTHESES>
You may ONLY use these issue types:
- spill: Visible liquid on floor/surface
- damage: Visible physical damage to equipment/infrastructure
- obstruction: Blocked pathways, exits, or access points
- missing_safety_equipment: Absent guards, covers, PPE stations
- wear: Visible degradation, corrosion, fraying
- contamination: Foreign material where it shouldn't be
- disorganization: Clutter, improper storage
- electrical_hazard: Exposed wiring, damaged panels (visual evidence only)
- fire_risk: Visible heat damage, smoke residue, improper flammable storage
- ergonomic_concern: Workstation arrangement issues visible
- leak: Visible fluid leak from equipment
- structural: Visible cracks, deformation, instability
- unknown: Cannot determine issue type from visual evidence
</ISSUE_TYPES_FOR_HYPOTHESES>

<SEVERITY_HINT_GUIDELINES>
Visual severity hints (NOT final classification — downstream LLM makes final determination):
- critical: Active emergency visible (flames, smoke, flooding, person down/injured)
- high: Clear immediate hazard visible (large spill, major structural damage, exposed live wiring)
- medium: Visible issue requiring attention (moderate wear, small contained spill, damaged equipment)
- low: Minor visual observation (slight disorganization, cosmetic damage, routine wear)
- none: No issues detected in image
</SEVERITY_HINT_GUIDELINES>

<CONFIDENCE_SCORING>
For each hypothesis, score based on visual evidence clarity:
- 0.80-1.00: Object/condition is clearly and unambiguously visible
- 0.60-0.79: Likely present but minor visual ambiguity exists
- 0.40-0.59: Possibly present — strong recommendation for human verification
- Below 0.40: Too uncertain — do NOT include in hypotheses; mention in visual_summary only
</CONFIDENCE_SCORING>

<IMAGE_QUALITY_ASSESSMENT>
- clear: Sharp, well-lit, good resolution, full scene visible
- acceptable: Minor issues but core analysis is reliable
- blurry: Motion blur or focus issues affecting reliability — flag for review
- dark: Insufficient lighting prevents reliable analysis — flag for review
- overexposed: Too bright, critical details washed out — flag for review
- obstructed: Key areas blocked by objects — flag for review
- partial: Only portion of relevant scene visible — flag for review
</IMAGE_QUALITY_ASSESSMENT>

<MANDATORY_HUMAN_REVIEW_TRIGGERS>
Set requires_human_review = true when ANY of these conditions exist:
1. Any hypothesis confidence < 0.6
2. Image quality is blurry, dark, overexposed, obstructed, or partial
3. Visual severity hint is high or critical
4. Scene type is unknown
5. Cannot clearly identify key objects in frame
6. Potential person injury or distress visible (ALWAYS escalate)
7. Multiple conflicting hypotheses with similar confidence
</MANDATORY_HUMAN_REVIEW_TRIGGERS>

<OUTPUT_FORMAT>
Respond with ONLY valid JSON — no markdown, no explanations outside the JSON:
{
  "visual_summary": "Factual 2-4 sentence description of what is visible. Use hedged language for uncertain observations.",
  "confirmed_observations": ["clearly visible objects/conditions"],
  "ambiguous_observations": ["possibly present but unclear elements"],
  "detected_objects": ["all identifiable objects in scene"],
  "scene_type": "factory_floor|warehouse|office|outdoor_industrial|laboratory|loading_dock|machine_shop|electrical_room|chemical_storage|construction_site|vehicle_fleet|transport|unknown",
  "potential_issue_detected": true/false,
  "issue_hypotheses": [
    {"issue_type": "from allowed types only", "confidence": 0.0-1.0, "visual_evidence": "what you see that suggests this"}
  ],
  "visual_severity_hint": "critical|high|medium|low|none",
  "image_quality": "clear|acceptable|blurry|dark|overexposed|obstructed|partial",
  "requires_human_review": true/false,
  "review_reasons": ["specific reasons if requires_human_review is true"],
  "analysis_limitations": "any constraints on analysis due to image quality, angle, or missing context"
}
</OUTPUT_FORMAT>"""


USER_PROMPT_TEMPLATE = """<CONTEXT>
{context}
</CONTEXT>

<TASK>
Analyze the provided industrial image and extract objective visual evidence.

REQUIREMENTS:
1. Describe ONLY what you can directly observe in the image
2. Use hedged language ("appears to be", "possibly") for uncertain observations
3. Separate confirmed observations from ambiguous ones
4. Set requires_human_review=true if ANY uncertainty exists
5. Provide specific visual_evidence for each hypothesis

REMINDERS:
- You extract EVIDENCE, not conclusions
- When uncertain, explicitly state your uncertainty
- Never fabricate details not visible in the image
- A conservative analysis flagging for human review is better than an overconfident wrong analysis
- Output ONLY valid JSON, no markdown formatting
</TASK>"""


# ============================================
# LVM ANALYZER CLASS
# ============================================

class LVMAnalyzer:
    """
    Vision Language Model analyzer using Qwen 2.5 VL via OpenRouter.
    
    Designed for industrial image analysis with structured output.
    Implements retry logic, timeout handling, and confidence normalization.
    """
    
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    MODEL = "qwen/qwen-2.5-vl-7b-instruct:free"
    
    # Configuration
    DEFAULT_TIMEOUT = 60  # seconds
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds
    
    def __init__(
        self,
        api_key: str,
        site_url: str = "https://smartclaim.ai",
        site_name: str = "SmartClaim AI",
        timeout: int = DEFAULT_TIMEOUT
    ):
        """
        Initialize the LVM analyzer.
        
        Args:
            api_key: OpenRouter API key
            site_url: Your site URL for OpenRouter headers
            site_name: Your site name for OpenRouter headers
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.site_url = site_url
        self.site_name = site_name
        self.timeout = timeout
        
        # Metrics tracking
        self._total_calls = 0
        self._successful_calls = 0
        self._failed_calls = 0
        self._total_latency_ms = 0.0
        
    def _get_headers(self) -> Dict[str, str]:
        """Build request headers for OpenRouter."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
        }
    
    def _build_messages(
        self,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Build the message payload for the API request.
        
        Args:
            image_url: URL of the image to analyze (can be data URI)
            metadata: Optional context about the image
        
        Returns:
            List of message objects for the API
        """
        # Build context string from metadata
        context_parts = []
        if metadata:
            if metadata.get("source"):
                context_parts.append(f"Source: {metadata['source']}")
            if metadata.get("location"):
                context_parts.append(f"Location: {metadata['location']}")
            if metadata.get("department"):
                context_parts.append(f"Department: {metadata['department']}")
            if metadata.get("timestamp"):
                context_parts.append(f"Timestamp: {metadata['timestamp']}")
            if metadata.get("reported_issue"):
                context_parts.append(f"Reported issue: {metadata['reported_issue']}")
        
        context = "; ".join(context_parts) if context_parts else "No additional context provided"
        
        user_prompt = USER_PROMPT_TEMPLATE.format(context=context)
        
        return [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": user_prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ]
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse and validate the model response.
        
        Args:
            response_text: Raw text from the model
            
        Returns:
            Parsed and validated JSON object
            
        Raises:
            ValueError: If response cannot be parsed or validated
        """
        # Clean the response text
        text = response_text.strip()
        
        # Try to extract JSON from markdown code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end > start:
                text = text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start:
                text = text[start:end].strip()
        
        # Parse JSON
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Raw response: {response_text[:500]}")
            raise ValueError(f"Failed to parse model response as JSON: {e}")
        
        # Validate and normalize the response
        return self._validate_and_normalize(data)
    
    def _validate_and_normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate response against schema and normalize values.
        
        Args:
            data: Parsed JSON response
            
        Returns:
            Validated and normalized response
        """
        # Initialize review_reasons list
        review_reasons = []
        
        # Required fields with defaults
        normalized = {
            "visual_summary": data.get("visual_summary", "Unable to analyze image"),
            "confirmed_observations": data.get("confirmed_observations", []),
            "ambiguous_observations": data.get("ambiguous_observations", []),
            "detected_objects": data.get("detected_objects", []),
            "scene_type": data.get("scene_type", "unknown"),
            "potential_issue_detected": data.get("potential_issue_detected", False),
            "issue_hypotheses": data.get("issue_hypotheses", []),
            "visual_severity_hint": data.get("visual_severity_hint", "none"),
            "image_quality": data.get("image_quality", "clear"),
            "requires_human_review": data.get("requires_human_review", True),
            "review_reasons": data.get("review_reasons", []),
            "analysis_limitations": data.get("analysis_limitations", ""),
        }
        
        # Validate scene_type
        valid_scene_types = [e.value for e in SceneType]
        if normalized["scene_type"] not in valid_scene_types:
            normalized["scene_type"] = "unknown"
            review_reasons.append("Unknown scene type detected")
        
        # Validate and normalize issue_hypotheses
        valid_issue_types = [e.value for e in IssueType]
        validated_hypotheses = []
        for hyp in normalized["issue_hypotheses"]:
            if isinstance(hyp, dict):
                issue_type = hyp.get("issue_type", "unknown")
                if issue_type not in valid_issue_types:
                    issue_type = "unknown"
                
                # Normalize confidence to [0, 1]
                confidence = float(hyp.get("confidence", 0.0))
                confidence = max(0.0, min(1.0, confidence))
                
                # Get visual evidence (new field)
                visual_evidence = hyp.get("visual_evidence", "No visual evidence provided")
                
                validated_hypotheses.append({
                    "issue_type": issue_type,
                    "confidence": round(confidence, 3),
                    "visual_evidence": visual_evidence
                })
        
        normalized["issue_hypotheses"] = validated_hypotheses
        
        # Validate severity hint
        valid_severities = [e.value for e in SeverityHint]
        if normalized["visual_severity_hint"] not in valid_severities:
            normalized["visual_severity_hint"] = "none"
        
        # Validate image quality
        valid_qualities = [e.value for e in ImageQuality]
        if normalized["image_quality"] not in valid_qualities:
            normalized["image_quality"] = "clear"
        
        # Ensure confirmed_observations and ambiguous_observations are lists
        for field in ["confirmed_observations", "ambiguous_observations", "detected_objects"]:
            if not isinstance(normalized[field], list):
                normalized[field] = []
            normalized[field] = [str(obj) for obj in normalized[field]]
        
        # Ensure booleans
        normalized["potential_issue_detected"] = bool(normalized["potential_issue_detected"])
        normalized["requires_human_review"] = bool(normalized["requires_human_review"])
        
        # Auto-trigger human review for certain conditions
        if normalized["image_quality"] in ["blurry", "dark", "overexposed", "obstructed", "partial"]:
            normalized["requires_human_review"] = True
            review_reasons.append(f"Image quality issue: {normalized['image_quality']}")
        
        if normalized["visual_severity_hint"] in ["high", "critical"]:
            normalized["requires_human_review"] = True
            review_reasons.append(f"High severity detected: {normalized['visual_severity_hint']}")
        
        if normalized["scene_type"] == "unknown":
            normalized["requires_human_review"] = True
            if "Unknown scene type" not in str(review_reasons):
                review_reasons.append("Could not determine scene type")
        
        # Check if any hypothesis has confidence below threshold (0.6)
        low_confidence_hypotheses = [
            h for h in normalized["issue_hypotheses"]
            if h["confidence"] < 0.6
        ]
        if low_confidence_hypotheses and normalized["potential_issue_detected"]:
            normalized["requires_human_review"] = True
            review_reasons.append(f"Low confidence hypotheses: {len(low_confidence_hypotheses)} below 0.6 threshold")
        
        # Merge review_reasons from response with auto-generated ones
        existing_reasons = normalized.get("review_reasons", [])
        if isinstance(existing_reasons, list):
            review_reasons = list(set(existing_reasons + review_reasons))
        normalized["review_reasons"] = review_reasons
        
        return normalized
    
    def _make_request_with_retry(
        self,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Make API request with retry logic.
        
        Args:
            payload: Request payload
            
        Returns:
            API response
            
        Raises:
            Exception: If all retries fail
        """
        last_exception = None
        
        for attempt in range(self.MAX_RETRIES):
            try:
                response = requests.post(
                    url=self.OPENROUTER_URL,
                    headers=self._get_headers(),
                    data=json.dumps(payload),
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limited - wait and retry
                    wait_time = self.RETRY_DELAY * (attempt + 1)
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                    time.sleep(wait_time)
                    continue
                elif response.status_code >= 500:
                    # Server error - retry
                    logger.warning(f"Server error {response.status_code}, retrying...")
                    time.sleep(self.RETRY_DELAY)
                    continue
                else:
                    # Client error - don't retry
                    raise Exception(f"API error {response.status_code}: {response.text}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Request timeout on attempt {attempt + 1}")
                last_exception = Exception("Request timeout")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request exception on attempt {attempt + 1}: {e}")
                last_exception = e
            
            if attempt < self.MAX_RETRIES - 1:
                time.sleep(self.RETRY_DELAY)
        
        raise last_exception or Exception("All retries exhausted")
    
    def analyze_image(
        self,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze an image and return structured visual evidence.
        
        This is the main entry point for the LVM analysis.
        
        Args:
            image_url: URL of the image to analyze (HTTP/HTTPS or data URI)
            metadata: Optional context about the image
                - source: Where the image came from
                - location: Physical location
                - department: Department context
                - timestamp: When the image was taken
                - reported_issue: User-reported issue description
        
        Returns:
            Structured LVM output as dictionary with fields:
                - visual_summary: Factual description
                - detected_objects: List of visible objects
                - scene_type: Type of scene
                - potential_issue_detected: Boolean
                - issue_hypotheses: List of {issue_type, confidence}
                - visual_severity_hint: Severity assessment
                - image_quality: Quality assessment
                - requires_human_review: Boolean
                - processing_time_ms: Analysis time
                - model_version: Model identifier
        
        Raises:
            ValueError: If image cannot be analyzed
            Exception: If API call fails
        """
        start_time = time.time()
        self._total_calls += 1
        
        logger.info(f"Analyzing image: {image_url[:100]}...")
        
        try:
            # Build request payload
            messages = self._build_messages(image_url, metadata)
            
            payload = {
                "model": self.MODEL,
                "messages": messages,
                "temperature": 0.1,  # Low temperature for deterministic output
                "max_tokens": 1024,
            }
            
            # Make request
            response = self._make_request_with_retry(payload)
            
            # Extract response content
            if "choices" not in response or not response["choices"]:
                raise ValueError("No choices in API response")
            
            content = response["choices"][0].get("message", {}).get("content", "")
            if not content:
                raise ValueError("Empty response content")
            
            # Parse and validate response
            result = self._parse_response(content)
            
            # Add metadata
            processing_time_ms = (time.time() - start_time) * 1000
            result["processing_time_ms"] = round(processing_time_ms, 2)
            result["model_version"] = self.MODEL
            
            # Calculate raw confidence (average of hypotheses)
            if result["issue_hypotheses"]:
                result["raw_confidence"] = round(
                    sum(h["confidence"] for h in result["issue_hypotheses"]) 
                    / len(result["issue_hypotheses"]),
                    3
                )
            else:
                result["raw_confidence"] = None
            
            # Update metrics
            self._successful_calls += 1
            self._total_latency_ms += processing_time_ms
            
            logger.info(
                f"Analysis complete in {processing_time_ms:.0f}ms. "
                f"Scene: {result['scene_type']}, "
                f"Issue detected: {result['potential_issue_detected']}"
            )
            
            return result
            
        except Exception as e:
            self._failed_calls += 1
            logger.error(f"Analysis failed: {e}")
            
            # Return fallback response
            return self._get_fallback_response(str(e), start_time)
    
    def _get_fallback_response(
        self,
        error_message: str,
        start_time: float
    ) -> Dict[str, Any]:
        """
        Generate a fallback response when analysis fails.
        
        Args:
            error_message: Description of the error
            start_time: When processing started
            
        Returns:
            Conservative fallback response requiring human review
        """
        processing_time_ms = (time.time() - start_time) * 1000
        
        return {
            "visual_summary": f"Analysis failed: {error_message}",
            "confirmed_observations": [],
            "ambiguous_observations": [],
            "detected_objects": [],
            "scene_type": "unknown",
            "potential_issue_detected": False,
            "issue_hypotheses": [
                {"issue_type": "unknown", "confidence": 0.0, "visual_evidence": "Analysis failed"}
            ],
            "visual_severity_hint": "none",
            "image_quality": "obstructed",
            "requires_human_review": True,
            "review_reasons": [f"Analysis error: {error_message}"],
            "analysis_limitations": f"Unable to analyze image due to error: {error_message}",
            "processing_time_ms": round(processing_time_ms, 2),
            "model_version": self.MODEL,
            "raw_confidence": None,
            "error": error_message
        }
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get analyzer metrics for monitoring.
        
        Returns:
            Dictionary with total_calls, successful_calls, failed_calls,
            average_latency_ms, success_rate
        """
        avg_latency = (
            self._total_latency_ms / self._successful_calls
            if self._successful_calls > 0
            else 0
        )
        
        success_rate = (
            self._successful_calls / self._total_calls
            if self._total_calls > 0
            else 0
        )
        
        return {
            "total_calls": self._total_calls,
            "successful_calls": self._successful_calls,
            "failed_calls": self._failed_calls,
            "average_latency_ms": round(avg_latency, 2),
            "success_rate": round(success_rate, 3)
        }


# ============================================
# CONVENIENCE FUNCTION
# ============================================

def analyze_image_with_lvm(
    image_url: str,
    metadata: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze an industrial image using the LVM.
    
    This is the primary integration point for the multimodal pipeline.
    
    Args:
        image_url: URL of the image (HTTP/HTTPS or base64 data URI)
        metadata: Optional context dict with keys:
            - source: Image source
            - location: Physical location
            - department: Department context
            - timestamp: Capture time
            - reported_issue: User description
        api_key: OpenRouter API key (defaults to env var OPENROUTER_API_KEY)
    
    Returns:
        Structured visual evidence dictionary ready for aggregation layer
    
    Example:
        >>> result = analyze_image_with_lvm(
        ...     image_url="https://example.com/machine.jpg",
        ...     metadata={"location": "Factory Floor B", "department": "Maintenance"}
        ... )
        >>> print(result["visual_summary"])
        >>> print(result["issue_hypotheses"])
    """
    import os
    
    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY must be provided or set in environment")
    
    analyzer = LVMAnalyzer(api_key=key)
    return analyzer.analyze_image(image_url, metadata)


# ============================================
# IMAGE ENCODING UTILITIES
# ============================================

def encode_image_to_data_uri(
    image_path: str,
    mime_type: str = "image/jpeg"
) -> str:
    """
    Encode a local image file to a data URI.
    
    Args:
        image_path: Path to the image file
        mime_type: MIME type of the image
        
    Returns:
        Data URI string suitable for the API
    """
    with open(image_path, "rb") as f:
        image_data = f.read()
    
    base64_data = base64.b64encode(image_data).decode("utf-8")
    return f"data:{mime_type};base64,{base64_data}"


def encode_image_bytes_to_data_uri(
    image_bytes: bytes,
    mime_type: str = "image/jpeg"
) -> str:
    """
    Encode image bytes to a data URI.
    
    Args:
        image_bytes: Raw image bytes
        mime_type: MIME type of the image
        
    Returns:
        Data URI string suitable for the API
    """
    base64_data = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{base64_data}"


# ============================================
# MODULE EXPORTS
# ============================================

__all__ = [
    "LVMAnalyzer",
    "LVMOutput",
    "IssueHypothesis",
    "SceneType",
    "IssueType",
    "SeverityHint",
    "ImageQuality",
    "analyze_image_with_lvm",
    "encode_image_to_data_uri",
    "encode_image_bytes_to_data_uri",
]
