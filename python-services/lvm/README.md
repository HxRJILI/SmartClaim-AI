# LVM (Vision Language Model) Integration Guide
## SmartClaim AI - Industrial Image Analysis

### Overview

The LVM service uses **Qwen 2.5 VL 7B** via OpenRouter to analyze industrial images and produce structured visual evidence for the multimodal pipeline.

### Architecture Position

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT LAYER                                   │
│           Text, Voice, Images, Documents                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               PRE-PROCESSING & PERCEPTION                        │
│  ┌─────────────┐  ┌────────────────┐  ┌───────────────────────┐ │
│  │ ASR (Vosk)  │  │ OCR/Doc Extract │  │ LVM (Qwen 2.5 VL)    │ │
│  │    → text   │  │     → text      │  │  → structured JSON   │ │
│  └─────────────┘  └────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│           MULTIMODAL EVIDENCE AGGREGATION                        │
│                                                                  │
│  • Merge ASR + OCR + LVM outputs + user text                    │
│  • Confidence scoring                                            │
│  • Canonical incident representation                             │
│  • LVM output stored as "vision_evidence"                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              REASONING & DECISION (Gemini 2.5 Flash)             │
│                                                                  │
│  • RAG context retrieval                                         │
│  • Department classification                                     │
│  • SLA assignment                                                │
│  • Complaint vs NC decision                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Output Schema

The LVM produces structured JSON with the following fields:

```json
{
  "visual_summary": "concise factual description of what is visible",
  "detected_objects": ["object1", "object2", "..."],
  "scene_type": "industrial | office | warehouse | transport | outdoor | unknown",
  "potential_issue_detected": true,
  "issue_hypotheses": [
    {
      "issue_type": "safety | maintenance | quality | IT | logistics | HR | legal | finance | unknown",
      "confidence": 0.0-1.0
    }
  ],
  "visual_severity_hint": "low | medium | high | critical",
  "image_quality": "clear | blurry | dark | obstructed",
  "requires_human_review": true,
  "processing_time_ms": 1234.56,
  "model_version": "qwen/qwen-2.5-vl-7b-instruct:free"
}
```

### Field Descriptions

| Field | Type | Description | Trusted by Downstream |
|-------|------|-------------|----------------------|
| `visual_summary` | string | Factual description of visible content | ✅ High trust |
| `detected_objects` | string[] | List of identified objects | ✅ High trust |
| `scene_type` | enum | Classification of scene | ⚠️ Medium trust |
| `potential_issue_detected` | boolean | Whether an issue was detected | ✅ High trust |
| `issue_hypotheses` | array | Potential issues with confidence | ⚠️ Use with confidence scores |
| `visual_severity_hint` | enum | Severity assessment | ⚠️ Advisory only |
| `image_quality` | enum | Image quality assessment | ✅ High trust |
| `requires_human_review` | boolean | Whether human review is needed | ✅ Always respect |
| `processing_time_ms` | float | Processing time | ℹ️ Metrics only |

### Integration Contract

**The LVM does NOT:**
- Classify the final department (that's the LLM's job)
- Decide complaint vs non-conformity type
- Assign SLA values
- Make workflow decisions

**The LVM ONLY provides:**
- Visual evidence
- Issue hypotheses for consideration
- Severity hints
- Human review recommendations

### API Usage

#### Endpoint
```
POST http://localhost:8005/analyze
```

#### Request
```json
{
  "image_url": "https://example.com/image.jpg",
  "metadata": {
    "source": "mobile_app",
    "location": "Factory Floor B",
    "department": "Maintenance",
    "timestamp": "2026-01-14T12:00:00Z",
    "reported_issue": "Strange noise from machine"
  }
}
```

#### Response
```json
{
  "visual_summary": "Industrial manufacturing floor showing a CNC machine with visible coolant leak pooling on floor",
  "detected_objects": ["CNC machine", "coolant puddle", "safety barrier", "control panel"],
  "scene_type": "industrial",
  "potential_issue_detected": true,
  "issue_hypotheses": [
    {"issue_type": "maintenance", "confidence": 0.85},
    {"issue_type": "safety", "confidence": 0.65}
  ],
  "visual_severity_hint": "medium",
  "image_quality": "clear",
  "requires_human_review": false,
  "processing_time_ms": 2341.5,
  "model_version": "qwen/qwen-2.5-vl-7b-instruct:free"
}
```

### Python Integration Example

```python
from lvm_analyzer import analyze_image_with_lvm

# Analyze an image
result = analyze_image_with_lvm(
    image_url="https://example.com/factory-image.jpg",
    metadata={
        "location": "Factory Floor B",
        "department": "Maintenance",
        "reported_issue": "Equipment making unusual sounds"
    }
)

# Use in aggregation layer
vision_evidence = {
    "source": "lvm",
    "summary": result["visual_summary"],
    "objects": result["detected_objects"],
    "hypotheses": result["issue_hypotheses"],
    "severity_hint": result["visual_severity_hint"],
    "needs_review": result["requires_human_review"]
}

# Forward to Gemini with combined evidence
combined_context = {
    "text_input": user_text,
    "asr_transcript": asr_result,
    "ocr_text": ocr_result,
    "vision_evidence": vision_evidence
}
```

### Edge Case Handling

#### Blurry Images
- `image_quality` set to "blurry"
- `requires_human_review` automatically set to `true`
- Lower confidence scores in hypotheses

#### Non-Industrial Images
- `scene_type` set to "unknown"
- Conservative issue detection
- `requires_human_review` set to `true`

#### Multiple Issues
- All detected issues listed in `issue_hypotheses`
- Sorted by confidence (highest first)
- `potential_issue_detected` is `true` if any hypothesis exists

#### API Failures
- Returns fallback response with `error` field
- All fields have safe defaults
- `requires_human_review` always `true`

### Confidence Score Guidelines

| Score Range | Interpretation | Action |
|-------------|----------------|--------|
| 0.0 - 0.3 | Possible but uncertain | Needs verification |
| 0.3 - 0.6 | Likely based on visual evidence | Consider as input |
| 0.6 - 0.8 | Strong visual evidence | High confidence |
| 0.8 - 1.0 | Clear and unambiguous | Reliable signal |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `SITE_URL` | Your site URL for headers | https://smartclaim.ai |
| `SITE_NAME` | Your site name for headers | SmartClaim AI |
| `LVM_PORT` | Service port | 8005 |
| `LVM_TIMEOUT` | Request timeout (seconds) | 60 |
| `LOG_LEVEL` | Logging level | INFO |

### Monitoring

#### Health Check
```bash
curl http://localhost:8005/health
```

#### Metrics
```bash
curl http://localhost:8005/metrics
```

Returns:
```json
{
  "total_calls": 100,
  "successful_calls": 95,
  "failed_calls": 5,
  "average_latency_ms": 2341.5,
  "success_rate": 0.95
}
```

### Docker Deployment

```bash
# Build and start LVM service
cd python-services
docker-compose up -d --build lvm

# Check logs
docker logs python-services-lvm-1 -f

# Test endpoint
curl -X POST http://localhost:8005/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/test.jpg"}'
```

### Security Considerations

1. **API Key Protection**: Store `OPENROUTER_API_KEY` securely, never commit to git
2. **Input Validation**: All image URLs are validated before processing
3. **Rate Limiting**: Built-in retry logic with exponential backoff
4. **Logging**: Sensitive data is not logged; only metadata and metrics
