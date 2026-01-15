# AI Services

Detailed documentation for each AI microservice.

## Service Overview

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| Extractor | 8000 | PaddleOCR | Document text extraction |
| Classifier | 8001 | Gemini | Text classification |
| Transcriber | 8002 | VOSK + Whisper | Audio transcription |
| Chat | 8003 | Gemini + RAG | Conversational AI |
| RAG | 8004 | Qdrant | Knowledge retrieval |
| LVM | 8005 | Qwen VL | Image analysis |
| Aggregator | 8006 | Python | Evidence combination |
| SLA | 8007 | Rule + ML | Time prediction |

## Extractor Service

### Description
Extracts text content from various document formats using OCR and parsing libraries.

### Supported Formats
- PDF (with OCR for scanned documents)
- DOCX, DOC
- XLSX, CSV
- Images (JPG, PNG, WebP)
- Plain text (TXT, MD)

### API

```http
POST /extract
Content-Type: multipart/form-data

file: <binary>
```

### Response

```json
{
  "text": "extracted content",
  "page_count": 1,
  "tables": [],
  "confidence": 0.95
}
```

## Classifier Service

### Description
Classifies incident descriptions into categories and priorities using Google Gemini.

### Categories
- safety
- quality
- maintenance
- logistics
- hr
- other

### Priorities
- critical
- high
- medium
- low

### API

```http
POST /classify
Content-Type: application/json

{
  "text": "incident description",
  "language": "fr"
}
```

### Response

```json
{
  "category": "safety",
  "priority": "high",
  "confidence": 0.92,
  "summary": "brief summary",
  "keywords": ["keyword1", "keyword2"]
}
```

## Transcriber Service

### Description
Converts audio recordings to text using a two-stage pipeline.

### Pipeline
1. VOSK: Fast initial transcription
2. Whisper: High-accuracy refinement

### Supported Formats
- MP3
- WAV
- M4A
- OGG

### API

```http
POST /transcribe
Content-Type: multipart/form-data

audio: <binary>
```

### Response

```json
{
  "text": "transcribed text",
  "language": "fr",
  "confidence": 0.88,
  "duration_seconds": 45
}
```

## Chat Service

### Description
Context-aware conversational AI assistant with role-based responses.

### Features
- Role-aware responses (worker, manager, admin)
- RAG integration for knowledge retrieval
- Conversation history support
- Multi-language support

### API

```http
POST /chat
Content-Type: application/json

{
  "message": "user message",
  "role": "worker",
  "department": "maintenance",
  "history": []
}
```

### Response

```json
{
  "response": "AI response",
  "sources": ["source1", "source2"],
  "confidence": 0.9
}
```

## LVM Service

### Description
Analyzes images to extract visual evidence using Vision Language Models.

### Capabilities
- Scene identification
- Object detection
- Hazard recognition
- Severity assessment

### API

```http
POST /analyze
Content-Type: application/json

{
  "image_url": "https://..."
}
```

### Response

```json
{
  "visual_summary": "description",
  "scene_type": "industrial_floor",
  "detected_objects": ["machine", "spill"],
  "visual_severity": "medium",
  "requires_human_review": true
}
```

## Health Checks

All services expose a health endpoint:

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-01T00:00:00Z"
}
```
