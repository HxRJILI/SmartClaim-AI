# SmartClaim AI - Technical Architecture Explanation

## Overview

SmartClaim is an intelligent workplace claims and non-conformity management system that uses multiple AI components to process, classify, and route tickets. This document explains each component in detail.

---

## Table of Contents

1. [OCR (Optical Character Recognition)](#1-ocr-optical-character-recognition)
2. [ASR (Automatic Speech Recognition)](#2-asr-automatic-speech-recognition)
3. [Extractor Service](#3-extractor-service)
4. [LVM (Large Vision Model)](#4-lvm-large-vision-model)
5. [LLM (Large Language Model) / Classifier](#5-llm-large-language-model--classifier)
6. [RAG (Retrieval-Augmented Generation)](#6-rag-retrieval-augmented-generation)
7. [AI Assistant (Chat)](#7-ai-assistant-chat)
8. [Tips (Safety Tips Generator)](#8-tips-safety-tips-generator)
9. [SLA Predictor](#9-sla-predictor)
10. [Aggregator (Multimodal Evidence)](#10-aggregator-multimodal-evidence)
11. [Database Architecture](#11-database-architecture)

---

## 1. OCR (Optical Character Recognition)

### Purpose
Extracts text from images and scanned documents within PDF files.

### Technology Stack
- **Engine**: PaddleOCR (Paddle Optical Character Recognition)
- **Languages Supported**: English (`en`), French (`fr`)
- **Location**: `python-services/extractor/app.py`
- **Port**: 8000

### How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Image/PDF      │ --> │   PaddleOCR      │ --> │  Extracted      │
│  (Scanned Doc)  │     │   Engine         │     │  Text           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

#### Step-by-Step Process:

1. **Image Input**: The system receives image bytes (from PDF pages or direct image uploads)

2. **Preprocessing**: 
   - Converts image to RGB format using PIL (Python Imaging Library)
   - Converts to NumPy array for PaddleOCR compatibility

3. **OCR Processing**:
   ```python
   results = reader.ocr(image_np, cls=True)
   ```
   - `cls=True` enables angle classification (detects rotated text)
   - PaddleOCR returns: `[box_coordinates, (text, confidence_score)]`

4. **Confidence Filtering**:
   ```python
   text_lines = [line[1][0] for line in results[0] if line[1][1] > 0.5]
   ```
   - Only text with confidence > 50% is included
   - Lines are joined with newlines

5. **Output**: Clean text string extracted from the image

### Singleton Pattern
```python
class OCREngine:
    _instance = None
    _reader = None
    _initialized = False
```
- Uses singleton pattern to avoid re-initializing the heavy OCR model
- Model loads once on first request, reused for subsequent calls

---

## 2. ASR (Automatic Speech Recognition)

### Purpose
Transcribes audio recordings (voice messages, recorded calls) into text.

### Technology Stack
- **Primary Engine**: Faster-Whisper (optimized Whisper model)
- **Secondary Engine**: VOSK (Kaldi-based offline ASR)
- **Audio Processing**: pydub, librosa, soundfile
- **Location**: `python-services/transcriber/app.py`
- **Port**: 8003

### Two-Stage Pipeline Architecture

```
┌─────────────┐    ┌────────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Audio File  │ -> │ Audio Convert  │ -> │ VOSK Encoding    │ -> │ Whisper     │
│ (MP3/WAV)   │    │ (16kHz mono)   │    │ (Fast ASR)       │    │ Refinement  │
└─────────────┘    └────────────────┘    └──────────────────┘    └─────────────┘
```

#### Step-by-Step Process:

1. **Audio Conversion**:
   ```python
   audio = AudioSegment.from_file(input_path)
   audio = audio.set_channels(1)        # Convert to mono
   audio = audio.set_frame_rate(16000)  # Resample to 16kHz
   audio = audio.set_sample_width(2)    # 16-bit audio
   ```

2. **Stage 1 - VOSK Encoding** (Fast, lightweight):
   - Provides initial speech-to-text encoding
   - Acts as a "coarse pass" over the audio
   - Very fast but lower accuracy

3. **Stage 2 - Whisper Decoding** (Accurate, slower):
   ```python
   model = WhisperModel(model_size, device="cpu", compute_type="int8")
   segments, info = model.transcribe(
       audio_path,
       beam_size=10,           # Better accuracy
       temperature=0.0,        # Deterministic results
       vad_filter=True,        # Voice Activity Detection
   )
   ```
   - Uses VAD (Voice Activity Detection) to filter silence
   - Beam search with beam_size=10 for improved accuracy
   - Temperature=0 ensures reproducible results

4. **Language Detection**:
   ```python
   detected_language = info.language
   ```
   - Automatically detects spoken language
   - Supports auto-detection or manual language specification

5. **Output**:
   ```json
   {
     "transcription": "The extracted text from audio...",
     "language": "en",
     "confidence": 0.95,
     "duration_seconds": 45.2
   }
   ```

---

## 3. Extractor Service

### Purpose
Extracts text content from various file formats to feed into the AI pipeline.

### Technology Stack
- **PDF**: PyPDF2, PyMuPDF (fitz)
- **Office Documents**: python-docx, python-pptx
- **Spreadsheets**: pandas
- **OCR**: PaddleOCR (for scanned documents)
- **Location**: `python-services/extractor/app.py`
- **Port**: 8000

### Supported File Types

| Format | Library | Features |
|--------|---------|----------|
| PDF | PyMuPDF + PaddleOCR | Text + embedded images + OCR for scans |
| DOCX | python-docx | Text + tables |
| PPTX | python-pptx | Slide text extraction |
| CSV/Excel | pandas | Table data with analysis context |
| TXT/MD | Native | Direct text extraction |

### How It Works

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Uploaded    │ --> │   Format Router     │ --> │  Extracted       │
│  File        │     │   (by extension)    │     │  Text + Metadata │
└──────────────┘     └─────────────────────┘     └──────────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
           ┌─────────┐  ┌─────────┐  ┌─────────┐
           │ PDF     │  │ Office  │  │ Tables  │
           │ Handler │  │ Handler │  │ Handler │
           └─────────┘  └─────────┘  └─────────┘
```

#### PDF Extraction (with OCR):
```python
def extract_from_pdf(file_content: bytes, use_ocr: bool = True):
    doc = fitz.open(stream=file_content, filetype="pdf")
    
    for page_num, page in enumerate(doc):
        # 1. Extract native text
        text = page.get_text()
        
        # 2. Extract embedded images for OCR
        image_list = page.get_images()
        for img in image_list:
            # Extract image bytes
            # Apply OCR if text extraction was poor
            ocr_text = perform_ocr(image_bytes)
```

#### Table Data (CSV/Excel) with Analysis Context:
```python
def extract_from_csv(file_content: bytes):
    df = pd.read_csv(io.BytesIO(file_content))
    
    return {
        "table_text": df.to_string(),
        "analysis_context": f"""
            Rows: {len(df)}
            Columns: {', '.join(df.columns)}
            --- TABLE DATA ---
            {table_text}
        """
    }
```

---

## 4. LVM (Large Vision Model)

### Purpose
Analyzes industrial/workplace images to extract structured visual evidence for downstream classification.

### Technology Stack
- **Model**: Qwen 2.5 VL 7B Instruct (via OpenRouter API)
- **Framework**: FastAPI
- **Location**: `python-services/lvm/app.py` + `lvm_analyzer.py`
- **Port**: 8005

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Image URL   │ --> │ LVM Analyzer     │ --> │ Structured Visual   │
│ (HTTP/Base64)│    │ (Qwen 2.5 VL)    │     │ Evidence JSON       │
└─────────────┘     └──────────────────┘     └─────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ OpenRouter API   │
                    │ (Cloud Inference)│
                    └──────────────────┘
```

### How It Works

#### 1. Image Input Processing:
```python
def analyze_image(image_url: str, metadata: dict = None):
    # Accept HTTP URLs or base64 data URIs
    if image_url.startswith('data:image'):
        # Already base64 encoded
        image_content = image_url
    else:
        # Fetch from URL and encode
        response = requests.get(image_url)
        image_content = encode_image_bytes_to_data_uri(response.content)
```

#### 2. LLM Prompt Construction:
The system uses a carefully crafted prompt that instructs the model to:
- **ONLY describe what is visible** (no inference)
- **Separate confirmed vs ambiguous observations**
- **Score confidence** (0.0-1.0) for each hypothesis
- **Flag for human review** when uncertain

#### 3. Output Schema:
```json
{
  "visual_summary": "Factory floor showing a wet area near machinery...",
  "detected_objects": ["forklift", "machinery", "wet floor", "safety cone"],
  "scene_type": "factory_floor",
  "potential_issue_detected": true,
  "issue_hypotheses": [
    {
      "issue_type": "spill",
      "confidence": 0.85,
      "visual_evidence": "visible liquid on floor"
    }
  ],
  "visual_severity_hint": "medium",
  "image_quality": "clear",
  "requires_human_review": false,
  "processing_time_ms": 2340.5,
  "model_version": "qwen/qwen-2.5-vl-7b-instruct:free"
}
```

### Issue Types Detected:
| Type | Description |
|------|-------------|
| spill | Visible liquid on floor/surface |
| damage | Physical damage to equipment |
| obstruction | Blocked pathways or exits |
| wear | Degradation, corrosion, fraying |
| contamination | Foreign material |
| electrical_hazard | Exposed wiring |
| fire_risk | Heat damage, smoke |
| structural | Cracks, deformation |

### Key Design Principle
**LVM does NOT classify the final category**. It only provides:
- Visual evidence extraction
- Severity hints
- Human review flags

The final classification is done by the LLM Classifier downstream.

---

## 5. LLM (Large Language Model) / Classifier

### Purpose
Classifies tickets into categories and priorities based on text description.

### Technology Stack
- **Model**: Google Gemini 2.5 Flash
- **Framework**: FastAPI
- **Location**: `python-services/classifier/app.py`
- **Port**: 8001

### How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Ticket Text     │ --> │ Gemini 2.5 Flash │ --> │ Classification  │
│ (Description)   │     │ (Structured)     │     │ + Summary       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

#### Classification Categories:
| Category | Department | Use Case |
|----------|------------|----------|
| safety | Safety & Security | Injuries, hazards, emergencies |
| quality | Quality Control | Defects, process deviations |
| maintenance | Maintenance | Equipment issues, repairs |
| logistics | Logistics | Supply chain, delivery issues |
| hr | Human Resources | Employee concerns |
| other | - | Uncategorized issues |

#### Priority Levels:
| Priority | Response Time | Criteria |
|----------|---------------|----------|
| critical | Immediate | Active danger, emergency |
| high | Same day | Confirmed incident |
| medium | 48-72 hours | Important but not urgent |
| low | Routine | Minor issues |

#### Prompt Engineering:
The classifier uses a detailed system prompt with:

1. **Critical Rules**:
   - Never auto-classify as "safety" without explicit evidence
   - Distinguish CONFIRMED vs POTENTIAL incidents
   - Support bilingual (French/English) input

2. **Confidence Calibration**:
   - 0.90-1.00: Explicit, unambiguous match
   - 0.70-0.89: Strong indicators with some ambiguity
   - 0.50-0.69: Requires human review
   - Below 0.50: Mandatory human review

#### Output:
```json
{
  "category": "maintenance",
  "priority": "medium",
  "summary": "Abnormal noise detected from CNC machine...",
  "confidence": 0.85,
  "suggested_department": "Maintenance",
  "keywords": ["machine", "noise", "CNC"],
  "reasoning": "Equipment issue without explicit safety hazard",
  "is_confirmed_incident": false,
  "requires_human_review": false
}
```

---

## 6. RAG (Retrieval-Augmented Generation)

### Purpose
Provides context-aware responses by retrieving relevant information from the ticket database.

### Technology Stack
- **Vector Database**: Qdrant
- **Embeddings**: Google text-embedding-004 (768 dimensions)
- **LLM**: Google Gemini 2.5 Flash
- **Location**: `python-services/rag/`
- **Port**: 8004

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User Query  │ --> │ Query Embedding  │ --> │ Vector Search   │
└─────────────┘     └──────────────────┘     │ (Qdrant)        │
                                              └────────┬────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Final       │ <-- │ LLM Generation   │ <-- │ Retrieved       │
│ Answer      │     │ (Gemini)         │     │ Chunks          │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

### Multi-Tenant Data Isolation

The RAG system implements **strict role-based filtering**:

| Role | Access |
|------|--------|
| Admin | All tickets in system |
| Department Manager | Only tickets assigned to their department |
| Worker | Only their own submitted tickets |

#### Filter Construction:
```python
class TenantFilterManager:
    def build_filter(self, user_context: UserContext) -> Filter:
        if user_context.role == UserRole.ADMIN:
            # Admin sees all - no filter needed
            return None
        
        elif user_context.role == UserRole.DEPARTMENT_MANAGER:
            # Filter by department_id
            return Filter(must=[
                FieldCondition(
                    key="department_id",
                    match=MatchValue(value=user_context.department_id)
                )
            ])
        
        else:  # WORKER
            # Filter by created_by (user's own tickets)
            return Filter(must=[
                FieldCondition(
                    key="created_by",
                    match=MatchValue(value=user_context.user_id)
                )
            ])
```

### Query Pipeline Steps:

1. **Broad Query Detection**:
   ```python
   broad_patterns = ["my tickets", "all tickets", "summarize", "how many"]
   is_broad = any(pattern in query.lower() for pattern in broad_patterns)
   ```

2. **Vector Search with Pre-Filtering**:
   ```python
   search_results = vector_store.search(
       query=query,
       user_context=user_context,  # Applied BEFORE search
       top_k=10,
       score_threshold=0.0 if is_broad else 0.5
   )
   ```

3. **Optional Reranking**:
   - Uses LLM to reorder results by relevance
   - Only for specific queries (not broad summaries)

4. **Context Building**:
   ```python
   context = f"[Ticket {ticket_num}]\n{content}"
   ```

5. **Response Generation**:
   ```python
   full_prompt = f"""
   {system_prompt}
   
   CONTEXT:
   {context}
   
   USER QUESTION: {query}
   """
   ```

### Ingestion Pipeline

When a ticket is created/updated:
```
Ticket Created → Chunking → Embedding → Upsert to Qdrant
```

Metadata stored with each vector:
- `ticket_id`, `ticket_number`
- `created_by`, `department_id`
- `category`, `priority`, `status`
- `chunk_type` (title, description, comment)

---

## 7. AI Assistant (Chat)

### Purpose
Provides conversational AI assistance to users with role-specific capabilities.

### Technology Stack
- **LLM**: Google Gemini 2.5 Flash
- **Integration**: RAG Service
- **Location**: `python-services/chat/app.py`
- **Port**: 8002

### How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User Message│ --> │ RAG Query        │ --> │ Context-Aware   │
│             │     │ (with isolation) │     │ Response        │
└─────────────┘     └──────────────────┘     └─────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Role-Based       │
                    │ System Prompt    │
                    └──────────────────┘
```

### Role-Specific Prompts:

**Worker**:
```
You help workers:
- Submit non-conformities and claims
- Check ticket status
- Understand company policies
- Get guidance on reporting procedures
```

**Department Manager**:
```
You help managers:
- Review and analyze department tickets
- Understand performance metrics
- Assign tickets to team members
- Track SLA compliance
```

**Admin**:
```
You help admins:
- Monitor system-wide performance
- Analyze trends across departments
- Configure system settings
- Access advanced analytics
```

### Chat Flow:

1. **Request Received**:
   ```python
   @app.post("/chat")
   async def chat(request: ChatRequest):
       # Extract user context
       user_id = request.user_id
       user_role = request.user_role
       department_id = request.department_id
   ```

2. **RAG Query** (with multi-tenant filtering):
   ```python
   rag_response = await query_rag_service(
       query=request.message,
       user_id=user_id,
       user_role=user_role,
       department_id=department_id
   )
   ```

3. **Context-Aware Response**:
   - If RAG finds relevant context → use it
   - If no context → fallback to general guidance

4. **Conversation History**:
   ```python
   for msg in request.history[-10:]:  # Last 10 messages
       conversation_history += f"{msg.role}: {msg.content}\n"
   ```

---

## 8. Tips (Safety Tips Generator)

### Purpose
Generates immediate safety guidance for high-priority incidents to help workers stay safe.

### Technology Stack
- **LLM**: Chat Service (Gemini 2.5 Flash)
- **Storage**: Supabase `safety_tips` table
- **Location**: `apps/web/app/api/smartclaim/tips/route.ts`

### When Tips Are Generated

Tips are **ONLY generated for**:
- Priority: `high` or `critical`
- After ticket submission

### How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ High-Priority   │ --> │ LLM Generation   │ --> │ Safety Tips     │
│ Ticket Created  │     │ (Context-aware)  │     │ (Stored in DB)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

#### Generation Prompt:
```
You are a workplace safety and incident response expert.
A worker has submitted a ${priority} priority incident ticket:

Category: ${category}
Title: ${title}
Description: ${description}

Please provide immediate, actionable safety tips:
1. Stay safe while waiting for assistance
2. Take appropriate immediate actions
3. Document the situation properly
4. Protect themselves and others
```

#### Output Example:
```
1. Move away from the affected area immediately
2. Alert nearby coworkers about the hazard
3. Do not attempt to clean up chemical spills yourself
4. Take photos from a safe distance for documentation
5. Wait for the safety team to arrive before returning
```

### Fallback System

If LLM fails, the system provides **predefined fallback tips** based on category:

```typescript
function generateFallbackTips(category: string, priority: string): string {
  const tips = {
    safety: [
      "Move to a safe location immediately",
      "Alert nearby personnel",
      "Do not touch unfamiliar substances",
      ...
    ],
    maintenance: [
      "Do not attempt repairs yourself",
      "Turn off equipment if safe to do so",
      ...
    ]
  };
  return tips[category].join('\n');
}
```

---

## 9. SLA Predictor

### Purpose
Predicts ticket resolution time and breach probability using a hybrid rule-based + ML approach.

### Technology Stack
- **Engine**: Hybrid (Rule-Based + XGBoost/LightGBM)
- **Framework**: FastAPI
- **Location**: `python-services/sla/app.py` + `sla_engine.py`
- **Port**: 8007

### Architecture

```
┌─────────────────┐
│ Ticket Input    │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────┐
│ Hybrid SLA Engine              │
├───────────────┬────────────────┤
│ Rule-Based    │ ML Model       │
│ (Deterministic)│ (Historical)  │
└───────┬───────┴───────┬────────┘
        │               │
        ▼               ▼
┌────────────────────────────────┐
│ Weighted Combination           │
│ (0.6 * Rule + 0.4 * ML)        │
└───────────────┬────────────────┘
                │
                ▼
┌─────────────────┐
│ SLA Prediction  │
└─────────────────┘
```

### Rule-Based Engine

#### Base SLA by Category:
| Category | Base Hours | Rationale |
|----------|------------|-----------|
| safety | 4h | Urgent resolution needed |
| IT | 16h | Same/next day |
| quality | 24h | Within 1 day |
| logistics | 24h | Within 1 day |
| maintenance | 48h | Within 2 days |
| hr | 72h | Within 3 days |
| finance | 72h | Within 3 days |
| legal | 120h | Complex cases |

#### Priority Multipliers:
| Priority | Multiplier | Effect |
|----------|------------|--------|
| critical | 0.25x | 4x faster |
| high | 0.5x | 2x faster |
| medium | 1.0x | Baseline |
| low | 1.5x | 1.5x slower |

#### Visual Severity Impact:
| Severity | Multiplier |
|----------|------------|
| critical | 0.5x |
| high | 0.75x |
| medium | 1.0x |
| low | 1.2x |

### Calculation Example:
```
Category: maintenance (48h base)
Priority: high (0.5x)
Visual Severity: high (0.75x)

Predicted Hours = 48 × 0.5 × 0.75 = 18 hours
```

### Breach Probability Calculation:

```python
def calculate_breach_probability(
    predicted_hours: float,
    has_visual_evidence: bool,
    requires_human_review: bool,
    confidence: float
) -> float:
    # Base probability from hours
    if predicted_hours <= 4:
        base_prob = 0.15
    elif predicted_hours <= 24:
        base_prob = 0.25
    else:
        base_prob = 0.35
    
    # Adjustments
    if requires_human_review:
        base_prob += 0.1
    if has_visual_evidence:
        base_prob -= 0.05
    
    return min(base_prob * (1 - confidence), 0.95)
```

### Output:
```json
{
  "predicted_resolution_hours": 18.0,
  "breach_probability": 0.22,
  "risk_level": "medium",
  "explanation": "Based on maintenance category with high priority...",
  "confidence": 0.85,
  "factors": [
    {"name": "Category: maintenance", "impact": "negative", "weight": 0.3},
    {"name": "Priority: high", "impact": "positive", "weight": 0.25},
    {"name": "Visual evidence: present", "impact": "positive", "weight": 0.15}
  ],
  "sla_deadline": "2025-01-16T14:00:00Z"
}
```

---

## 10. Aggregator (Multimodal Evidence)

### Purpose
Combines evidence from multiple sources (text, image, audio, document) into a unified evidence package for final classification.

### Technology Stack
- **Framework**: FastAPI
- **Location**: `python-services/aggregator/app.py`
- **Port**: 8006

### Architecture

```
          ┌─────────────┐
          │ Text Input  │────────────────┐
          └─────────────┘                │
                                         │
          ┌─────────────┐                │
          │ Image (LVM) │────────────────┤
          └─────────────┘                │
                                         ▼
          ┌─────────────┐        ┌───────────────────┐
          │ Audio (ASR) │────────│   Aggregator      │────────►  Final Evidence
          └─────────────┘        │   (Weighted       │
                                 │    Voting)        │
          ┌─────────────┐        └───────────────────┘
          │ Document    │────────────────┘
          │ (Extractor) │
          └─────────────┘
```

### Modality Weights:
| Source | Weight | Rationale |
|--------|--------|-----------|
| Text | 0.40 | Primary description |
| Image | 0.35 | High-value visual evidence |
| Audio | 0.15 | Contextual information |
| Document | 0.10 | Supporting reference |

### Weighted Voting Algorithm:

```python
def aggregate_evidence(package: EvidencePackage) -> AggregatedEvidence:
    category_votes = []
    
    # Collect votes from text
    if package.text_evidence:
        category_votes.append(CategoryVote(
            source=EvidenceSource.TEXT,
            category=package.text_evidence.category,
            confidence=package.text_evidence.confidence,
            weight=0.40
        ))
    
    # Collect votes from visual evidence
    if package.visual_evidence:
        for hypothesis in package.visual_evidence.issue_hypotheses:
            category_votes.append(CategoryVote(
                source=EvidenceSource.IMAGE,
                category=map_issue_to_category(hypothesis["issue_type"]),
                confidence=hypothesis["confidence"],
                weight=0.35
            ))
    
    # Calculate weighted scores
    category_scores = {}
    for vote in category_votes:
        score = vote.confidence * vote.weight
        category_scores[vote.category] = category_scores.get(vote.category, 0) + score
    
    # Select winner
    final_category = max(category_scores, key=category_scores.get)
```

### Human Review Triggers:
- Text confidence < 0.6
- LVM flags `requires_human_review`
- Image quality != "clear"
- Any safety issue detected
- Audio transcription confidence < 0.7

### Output:
```json
{
  "sources_used": ["text", "image"],
  "final_category": "safety",
  "final_priority": "high",
  "category_confidence": 0.87,
  "category_votes": [
    {"source": "text", "category": "safety", "confidence": 0.85, "weight": 0.40},
    {"source": "image", "category": "safety", "confidence": 0.90, "weight": 0.35}
  ],
  "unified_summary": "Potential safety hazard detected: liquid spill near machinery...",
  "has_visual_evidence": true,
  "visual_severity": "high",
  "requires_human_review": true,
  "human_review_reasons": ["Potential safety issue detected"],
  "sla_hints": {
    "visual_severity_multiplier": 0.75,
    "urgency_boost": true
  }
}
```

---

## 11. Database Architecture

### Overview

SmartClaim uses **2 database systems**:

| Database | Type | Purpose |
|----------|------|---------|
| PostgreSQL (Supabase) | Relational | Primary application data |
| Qdrant | Vector | RAG embeddings for AI search |

---

### PostgreSQL (Supabase) Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE DATABASE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────┐                │
│  │   departments   │◄───────│  user_profiles   │                │
│  └────────┬────────┘        └────────┬─────────┘                │
│           │                          │                          │
│           │    ┌─────────────────────┴─────────────────┐        │
│           │    │                                       │        │
│           ▼    ▼                                       ▼        │
│  ┌─────────────────┐        ┌──────────────────┐  ┌────────┐   │
│  │     tickets     │◄───────│ ticket_attachments│  │ auth.  │   │
│  └────────┬────────┘        └──────────────────┘  │ users  │   │
│           │                                        └────────┘   │
│           │                                                     │
│  ┌────────┴────────┐        ┌──────────────────┐               │
│  │ticket_activities│        │   safety_tips    │               │
│  └─────────────────┘        └──────────────────┘               │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────┐               │
│  │  chat_sessions  │        │  knowledge_base  │ (Vector)      │
│  └─────────────────┘        └──────────────────┘               │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────┐               │
│  │ ticket_metrics  │        │  notifications   │               │
│  └─────────────────┘        └──────────────────┘               │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────┐               │
│  │ ticket_comments │        │ticket_escalations│               │
│  └─────────────────┘        └──────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Essential Tables Detail

#### 1. `departments`
```sql
CREATE TABLE departments (
  id uuid PRIMARY KEY,
  name text UNIQUE NOT NULL,      -- "Safety & Security", "Maintenance"
  description text,
  manager_id uuid → auth.users,   -- Department manager
  created_at timestamp,
  updated_at timestamp
);
```

**Predefined Departments:**
| ID | Name |
|----|------|
| d1111111... | Safety & Security |
| d2222222... | Quality Control |
| d3333333... | Maintenance |
| d4444444... | Logistics |
| d5555555... | Human Resources |

---

#### 2. `user_profiles`
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY → auth.users,
  role user_role NOT NULL,      -- 'worker', 'department_manager', 'admin'
  department_id uuid → departments,
  full_name text,
  avatar_url text,
  created_at timestamp,
  updated_at timestamp
);
```

**User Roles:**
| Role | Permissions |
|------|-------------|
| worker | Create tickets, view own tickets |
| department_manager | Manage department tickets, assign users |
| admin | Full system access, all tickets |

---

#### 3. `tickets`
```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY,
  ticket_number text UNIQUE,     -- "TKT-2025-000001"
  title text NOT NULL,
  description text NOT NULL,
  category ticket_category,      -- ENUM: safety, quality, maintenance...
  priority ticket_priority,      -- ENUM: low, medium, high, critical
  status ticket_status,          -- ENUM: new, in_progress, resolved...
  
  -- Assignment
  created_by uuid → auth.users,
  assigned_to_department uuid → departments,
  assigned_to_user uuid → auth.users,
  
  -- Input metadata
  input_type text,               -- 'text', 'voice', 'image', 'document'
  original_content jsonb,        -- Original submission data
  
  -- AI processing
  ai_summary text,               -- LLM-generated summary
  ai_confidence_score numeric,   -- Classification confidence
  
  -- SLA tracking
  sla_deadline timestamp,
  resolved_at timestamp,
  closed_at timestamp,
  
  created_at timestamp,
  updated_at timestamp
);
```

**Ticket Status Flow:**
```
new → in_progress → pending_review → resolved → closed
              │
              └─────────────────→ rejected
```

---

#### 4. `ticket_attachments`
```sql
CREATE TABLE ticket_attachments (
  id uuid PRIMARY KEY,
  ticket_id uuid → tickets,
  file_name text,
  file_type text,          -- "image/jpeg", "application/pdf"
  file_size bigint,
  file_url text,           -- Supabase Storage URL
  extracted_text text,     -- OCR/extraction result
  created_at timestamp
);
```

---

#### 5. `ticket_activities`
```sql
CREATE TABLE ticket_activities (
  id uuid PRIMARY KEY,
  ticket_id uuid → tickets,
  user_id uuid → auth.users,
  activity_type text,      -- 'status_change', 'comment', 'assignment'
  content text,
  metadata jsonb,
  created_at timestamp
);
```

---

#### 6. `ticket_comments`
```sql
CREATE TABLE ticket_comments (
  id uuid PRIMARY KEY,
  ticket_id uuid → tickets,
  user_id uuid → auth.users,
  comment text NOT NULL,
  is_internal boolean,     -- Internal notes (manager only) vs public
  created_at timestamp,
  updated_at timestamp
);
```

---

#### 7. `safety_tips`
```sql
CREATE TABLE safety_tips (
  id uuid PRIMARY KEY,
  ticket_id uuid → tickets,
  user_id uuid → auth.users,
  tips_content text,       -- LLM-generated safety guidance
  priority text,
  category text,
  is_acknowledged boolean,
  generated_by text,       -- 'llm' or 'fallback'
  created_at timestamp,
  updated_at timestamp
);
```

---

#### 8. `chat_sessions`
```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY,
  user_id uuid → auth.users,
  title text,
  session_data jsonb,      -- Array of messages
  is_archived boolean,
  created_at timestamp,
  updated_at timestamp
);
```

**Session Data Structure:**
```json
{
  "messages": [
    {"role": "user", "content": "...", "timestamp": "..."},
    {"role": "assistant", "content": "...", "timestamp": "..."}
  ]
}
```

---

#### 9. `knowledge_base` (Vector Table)
```sql
CREATE TABLE knowledge_base (
  id uuid PRIMARY KEY,
  content text,
  metadata jsonb,
  embedding vector(1536),  -- pgvector extension
  department_id uuid → departments,
  created_at timestamp,
  updated_at timestamp
);
```

---

#### 10. `notifications`
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  user_id uuid → auth.users,
  type text,               -- 'ticket_assigned', 'sla_warning', etc.
  title text,
  message text,
  is_read boolean,
  metadata jsonb,
  created_at timestamp
);
```

---

#### 11. `ticket_metrics` (Analytics Cache)
```sql
CREATE TABLE ticket_metrics (
  id uuid PRIMARY KEY,
  metric_date date,
  department_id uuid → departments,
  total_tickets integer,
  new_tickets integer,
  in_progress_tickets integer,
  resolved_tickets integer,
  avg_resolution_time interval,
  sla_compliance_rate numeric,
  metrics_data jsonb,
  created_at timestamp
);
```

---

### Qdrant Vector Database

**Collection**: `smartclaim_tickets`

**Vector Configuration:**
```python
VectorParams(
    size=768,                    # Google text-embedding-004 dimension
    distance=Distance.COSINE,    # Cosine similarity
)
```

**Indexed Payload Fields:**
| Field | Type | Purpose |
|-------|------|---------|
| created_by | KEYWORD | Worker ticket filtering |
| department_id | KEYWORD | Manager ticket filtering |
| ticket_id | KEYWORD | Deduplication |
| category | KEYWORD | Category-based search |
| priority | KEYWORD | Priority filtering |
| status | KEYWORD | Status filtering |
| chunk_type | KEYWORD | title/description/comment |

---

### Database Relationships Summary

```
auth.users (Supabase Auth)
    │
    ├──► user_profiles (1:1)
    │         │
    │         └──► departments (N:1)
    │
    ├──► tickets (1:N as creator)
    │         │
    │         ├──► ticket_attachments (1:N)
    │         ├──► ticket_activities (1:N)
    │         ├──► ticket_comments (1:N)
    │         ├──► safety_tips (1:N)
    │         └──► ticket_escalations (1:N)
    │
    ├──► chat_sessions (1:N)
    └──► notifications (1:N)
```

---

## Service Port Summary

| Service | Port | Technology |
|---------|------|------------|
| Extractor (OCR) | 8000 | PaddleOCR, PyMuPDF |
| Classifier (LLM) | 8001 | Gemini 2.5 Flash |
| Chat | 8002 | Gemini + RAG |
| Transcriber (ASR) | 8003 | Whisper + VOSK |
| RAG | 8004 | Qdrant + Gemini |
| LVM | 8005 | Qwen 2.5 VL (OpenRouter) |
| Aggregator | 8006 | FastAPI |
| SLA | 8007 | Hybrid Rule+ML |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TICKET SUBMISSION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

User Input
    │
    ├── Text ──────────────────────────────────────────────┐
    │                                                      │
    ├── Image ──► LVM (8005) ──► Visual Evidence ─────────┤
    │                                                      │
    ├── Audio ──► Transcriber (8003) ──► Text ────────────┤
    │                                                      │
    └── Document ──► Extractor (8000) ──► Text ───────────┤
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Aggregator    │
                                                  │    (8006)       │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Classifier    │
                                                  │    (8001)       │
                                                  └────────┬────────┘
                                                           │
                              ┌─────────────────────────────┼─────────────────────────────┐
                              │                             │                             │
                              ▼                             ▼                             ▼
                     ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
                     │   SLA Engine    │          │   RAG Ingest    │          │   Safety Tips   │
                     │    (8007)       │          │    (8004)       │          │   (if urgent)   │
                     └─────────────────┘          └─────────────────┘          └─────────────────┘
                              │                             │                             │
                              └─────────────────────────────┼─────────────────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Database      │
                                                  │   (Supabase)    │
                                                  └─────────────────┘
```

---

## Conclusion

SmartClaim is a sophisticated multi-modal AI system that:

1. **Accepts diverse inputs**: Text, images, audio, documents
2. **Processes with specialized AI**: OCR, ASR, LVM, LLM
3. **Aggregates evidence**: Weighted voting across modalities
4. **Classifies accurately**: Category, priority, department routing
5. **Predicts SLA**: Hybrid rule-based + ML approach
6. **Provides context-aware assistance**: Multi-tenant RAG
7. **Ensures safety**: Automatic tip generation for urgent issues
8. **Maintains isolation**: Role-based data access at every layer
