# SmartClaim LVM Integration Contract

## Version 1.0.0

This document defines the formal integration contract between the Vision Language Model (LVM) service and the SmartClaim multimodal pipeline.

---

## 1. SERVICE INFORMATION

| Property | Value |
|----------|-------|
| **Service Name** | LVM (Vision Language Model) |
| **Port** | 8005 |
| **Model** | qwen/qwen-2.5-vl-7b-instruct:free |
| **Provider** | OpenRouter |
| **Purpose** | Industrial image analysis for visual evidence extraction |

---

## 2. INPUT CONTRACT

### 2.1 Endpoint
```
POST /analyze
Content-Type: application/json
```

### 2.2 Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image_url"],
  "properties": {
    "image_url": {
      "type": "string",
      "description": "URL of image (HTTP/HTTPS) or base64 data URI",
      "examples": [
        "https://example.com/factory-image.jpg",
        "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      ]
    },
    "metadata": {
      "type": "object",
      "properties": {
        "source": {
          "type": "string",
          "description": "Image source identifier (e.g., 'mobile_app', 'desktop', 'cctv')"
        },
        "location": {
          "type": "string",
          "description": "Physical location where image was captured"
        },
        "department": {
          "type": "string",
          "description": "Department context"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "When the image was captured"
        },
        "reported_issue": {
          "type": "string",
          "description": "User-reported issue description"
        },
        "ticket_id": {
          "type": "string",
          "format": "uuid",
          "description": "Associated ticket ID"
        },
        "user_id": {
          "type": "string",
          "format": "uuid",
          "description": "User who submitted the image"
        }
      }
    }
  }
}
```

### 2.3 Example Request

```json
{
  "image_url": "https://storage.smartclaim.ai/images/factory-floor-incident.jpg",
  "metadata": {
    "source": "mobile_app",
    "location": "Factory Floor B, Section 3",
    "department": "Maintenance",
    "timestamp": "2025-01-15T14:30:00Z",
    "reported_issue": "Strange noise and visible damage on conveyor belt",
    "ticket_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

---

## 3. OUTPUT CONTRACT

### 3.1 Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "visual_summary",
    "detected_objects",
    "scene_type",
    "potential_issue_detected",
    "issue_hypotheses",
    "visual_severity_hint",
    "image_quality",
    "requires_human_review",
    "processing_time_ms",
    "model_version"
  ],
  "properties": {
    "visual_summary": {
      "type": "string",
      "description": "Concise factual description of visible content (2-4 sentences)",
      "minLength": 10,
      "maxLength": 500
    },
    "detected_objects": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of objects detected in the image",
      "minItems": 0,
      "maxItems": 20
    },
    "scene_type": {
      "type": "string",
      "enum": ["industrial", "office", "warehouse", "transport", "outdoor", "unknown"],
      "description": "Classification of the scene type"
    },
    "potential_issue_detected": {
      "type": "boolean",
      "description": "Whether a potential issue was detected"
    },
    "issue_hypotheses": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["issue_type", "confidence"],
        "properties": {
          "issue_type": {
            "type": "string",
            "enum": ["safety", "maintenance", "quality", "IT", "logistics", "HR", "legal", "finance", "unknown"],
            "description": "Type of potential issue"
          },
          "confidence": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0,
            "description": "Confidence score for this hypothesis"
          }
        }
      },
      "description": "List of potential issue hypotheses with confidence scores"
    },
    "visual_severity_hint": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "description": "Visual assessment of issue severity"
    },
    "image_quality": {
      "type": "string",
      "enum": ["clear", "blurry", "dark", "obstructed"],
      "description": "Assessment of image quality"
    },
    "requires_human_review": {
      "type": "boolean",
      "description": "Whether human review is recommended"
    },
    "processing_time_ms": {
      "type": "number",
      "minimum": 0,
      "description": "Time taken to process the image in milliseconds"
    },
    "model_version": {
      "type": "string",
      "description": "Version of the model used for analysis"
    },
    "raw_confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Average confidence across all hypotheses"
    },
    "error": {
      "type": "string",
      "description": "Error message if analysis failed"
    }
  }
}
```

### 3.2 Example Response

```json
{
  "visual_summary": "Industrial conveyor belt system showing visible wear and debris accumulation. Metal components appear corroded with potential structural damage near the drive mechanism.",
  "detected_objects": [
    "conveyor_belt",
    "metal_frame",
    "motor",
    "debris",
    "corrosion_spots",
    "warning_sign"
  ],
  "scene_type": "industrial",
  "potential_issue_detected": true,
  "issue_hypotheses": [
    {
      "issue_type": "maintenance",
      "confidence": 0.85
    },
    {
      "issue_type": "safety",
      "confidence": 0.65
    },
    {
      "issue_type": "quality",
      "confidence": 0.40
    }
  ],
  "visual_severity_hint": "high",
  "image_quality": "clear",
  "requires_human_review": true,
  "processing_time_ms": 2340.5,
  "model_version": "qwen/qwen-2.5-vl-7b-instruct:free",
  "raw_confidence": 0.63
}
```

---

## 4. INTEGRATION RULES

### 4.1 What LVM DOES:
- ✅ Analyze images for visible content
- ✅ Detect objects and scene context
- ✅ Generate issue hypotheses with confidence scores
- ✅ Assess visual severity
- ✅ Flag images requiring human review
- ✅ Report image quality issues

### 4.2 What LVM DOES NOT DO:
- ❌ Final department classification (downstream task)
- ❌ Complaint vs non-conformity type decision
- ❌ SLA assignment
- ❌ Ticket creation or modification
- ❌ User notification

### 4.3 Downstream Consumer Contract

The LVM output is designed to be consumed by:

1. **Multimodal Evidence Aggregator** - Combines LVM output with:
   - Text analysis from Classifier
   - Audio transcription from Transcriber
   - OCR text from Extractor

2. **Final Classification Engine** - Uses aggregated evidence to:
   - Determine final category
   - Assign priority
   - Route to department

3. **Predictive SLA Engine** - Uses visual severity hint for:
   - Resolution time prediction
   - Breach probability calculation

---

## 5. ERROR HANDLING

### 5.1 Error Response Schema

```json
{
  "visual_summary": "Analysis failed",
  "detected_objects": [],
  "scene_type": "unknown",
  "potential_issue_detected": false,
  "issue_hypotheses": [
    {
      "issue_type": "unknown",
      "confidence": 0.0
    }
  ],
  "visual_severity_hint": "low",
  "image_quality": "obstructed",
  "requires_human_review": true,
  "processing_time_ms": 0,
  "model_version": "qwen/qwen-2.5-vl-7b-instruct:free",
  "error": "Description of what failed"
}
```

### 5.2 Common Error Scenarios

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| Invalid image URL | 400 | "Invalid image URL format" |
| Image not accessible | 422 | "Failed to fetch image from URL" |
| Image too large | 413 | "Image exceeds maximum size limit" |
| API key invalid | 500 | "OpenRouter API authentication failed" |
| Model timeout | 504 | "Analysis timeout exceeded" |
| Rate limited | 429 | "Rate limit exceeded, retry after X seconds" |

---

## 6. CONFIDENCE SCORING GUIDE

### 6.1 Confidence Interpretation

| Range | Meaning | Action |
|-------|---------|--------|
| **0.8 - 1.0** | High confidence, clear visual evidence | Auto-classify |
| **0.6 - 0.8** | Good confidence, some uncertainty | Auto-classify with flag |
| **0.4 - 0.6** | Moderate confidence, multiple interpretations | Human review suggested |
| **0.0 - 0.4** | Low confidence, insufficient evidence | Human review required |

### 6.2 Human Review Triggers

`requires_human_review` is set to `true` when:
- Image quality is not "clear"
- Primary hypothesis confidence < 0.5
- Multiple hypotheses with similar confidence (±0.1)
- Scene type is "unknown"
- Safety-related issue detected (always review)

---

## 7. RATE LIMITS & QUOTAS

| Metric | Limit | Behavior |
|--------|-------|----------|
| Requests per minute | 60 | Queue excess requests |
| Requests per hour | 1000 | Return 429 status |
| Max image size | 20MB | Reject with 413 |
| Max concurrent requests | 10 | Queue excess |
| Request timeout | 60 seconds | Return partial result |

---

## 8. VERSIONING

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial contract definition |

---

**Contract Owner:** AI Systems Team  
**Last Updated:** January 2025  
**Review Cycle:** Monthly
