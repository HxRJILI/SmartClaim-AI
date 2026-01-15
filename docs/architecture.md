# Architecture

SmartClaim AI follows a microservices architecture with three main tiers.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Desktop   │  │   Mobile   │  │   Tablet   │                │
│  │  Browser   │  │  Browser   │  │  Browser   │                │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│        │               │               │                        │
│        └───────────────┼───────────────┘                        │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js 15.x                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │   App    │  │   API    │  │  Server  │  │  Auth  │  │   │
│  │  │  Router  │  │  Routes  │  │  Actions │  │ Layer  │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│  Supabase    │  │ AI Services │  │   Qdrant     │
│  PostgreSQL  │  │   (8 svc)   │  │   Vector     │
└──────────────┘  └─────────────┘  └──────────────┘
```

## AI Services Architecture

```
                    ┌─────────────────────────────────┐
                    │         API Gateway             │
                    │        (Next.js API)            │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   Extractor   │           │  Transcriber  │           │     LVM       │
│   Port 8000   │           │   Port 8002   │           │   Port 8005   │
│   PaddleOCR   │           │ VOSK+Whisper  │           │   Qwen VL     │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │         Aggregator            │
                    │          Port 8006            │
                    │    Evidence Combination       │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │Classifier │   │    SLA    │   │    RAG    │
            │ Port 8001 │   │ Port 8007 │   │ Port 8004 │
            │  Gemini   │   │ Predictor │   │  Qdrant   │
            └───────────┘   └───────────┘   └───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │            Chat               │
                    │          Port 8003            │
                    │       Gemini + RAG            │
                    └───────────────────────────────┘
```

## Service Details

### Extractor Service (Port 8000)

**Purpose**: Extract text from documents and images

**Technology Stack**:
- PaddleOCR for image OCR
- PyMuPDF for PDF extraction
- python-docx for Word documents

**Endpoints**:
- `POST /extract` - Extract text from file
- `GET /health` - Health check

### Classifier Service (Port 8001)

**Purpose**: Classify text into categories and priorities

**Technology Stack**:
- Google Gemini 2.5 Flash
- Custom prompt engineering

**Endpoints**:
- `POST /classify` - Classify text
- `GET /health` - Health check

### Transcriber Service (Port 8002)

**Purpose**: Convert audio to text

**Technology Stack**:
- VOSK for initial transcription
- Whisper for refinement

**Endpoints**:
- `POST /transcribe` - Transcribe audio
- `GET /health` - Health check

### Chat Service (Port 8003)

**Purpose**: AI conversational assistant

**Technology Stack**:
- Google Gemini
- RAG integration

**Endpoints**:
- `POST /chat` - Send message
- `GET /health` - Health check

### RAG Service (Port 8004)

**Purpose**: Retrieval-Augmented Generation

**Technology Stack**:
- Qdrant vector database
- Sentence transformers

**Endpoints**:
- `POST /query` - Query knowledge base
- `POST /ingest` - Add documents
- `GET /health` - Health check

### LVM Service (Port 8005)

**Purpose**: Visual evidence analysis

**Technology Stack**:
- Qwen 2.5 VL 7B
- OpenRouter API

**Endpoints**:
- `POST /analyze` - Analyze image
- `GET /health` - Health check

### Aggregator Service (Port 8006)

**Purpose**: Combine evidence from multiple sources

**Technology Stack**:
- Custom Python engine
- Weighted voting algorithm

**Endpoints**:
- `POST /aggregate` - Aggregate evidence
- `GET /health` - Health check

### SLA Service (Port 8007)

**Purpose**: Predict resolution times

**Technology Stack**:
- Rule-based engine
- ML prediction model

**Endpoints**:
- `POST /predict` - Predict SLA
- `GET /health` - Health check

## Database Schema

See [Database Schema](database-schema.md) for detailed information.

## Security Architecture

See [Security Guide](security.md) for security details.
