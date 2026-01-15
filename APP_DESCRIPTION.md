# 📋 SmartClaim AI - Application Description

> **Enterprise-Grade Multimodal AI Platform for Industrial Incident Management**

---

## 📖 Overview

SmartClaim AI is a comprehensive incident and non-conformity management platform designed specifically for industrial environments. The system combines cutting-edge artificial intelligence with robust workflow management to streamline the entire lifecycle of workplace incidents, from initial report to final resolution.

---

## 🎯 Core Features

### 1. Multimodal Ticket Submission

SmartClaim AI accepts multiple input formats for maximum flexibility:

#### 📝 Text Input
- Free-form text descriptions in French or English
- Automatic language detection
- Spell-check and grammar suggestions

#### 📸 Image Upload
- Support for JPG, PNG, WebP, HEIC formats
- Maximum file size: 10MB
- Automatic image optimization
- Visual evidence extraction using Vision Language Models

#### 🎤 Voice Recording
- In-browser audio recording
- Support for MP3, WAV, M4A, OGG formats
- Maximum duration: 5 minutes
- Two-stage ASR pipeline (VOSK + Whisper) for accuracy

#### 📄 Document Upload
- Support for PDF, DOCX, XLSX, CSV, TXT, MD, PPT
- Automatic text extraction with OCR
- Table recognition and parsing
- Multi-page document support

---

### 2. AI-Powered Classification

The system automatically classifies tickets into categories and priorities:

#### Categories

| Category | Description | Auto-Assignment |
|----------|-------------|-----------------|
| 🔴 **Safety** | Physical hazards, injuries, emergencies | Safety & Security Dept. |
| 🟠 **Quality** | Product defects, process deviations | Quality Control Dept. |
| 🔵 **Maintenance** | Equipment issues, facility repairs | Maintenance Dept. |
| 🟢 **Logistics** | Supply chain, inventory problems | Logistics Dept. |
| 🟣 **HR** | Employee relations, conduct issues | Human Resources Dept. |
| ⚪ **Other** | Uncategorized issues | Admin Review |

#### Priorities

| Priority | Response Time | Description |
|----------|---------------|-------------|
| 🔥 **Critical** | < 1 hour | Immediate danger, ongoing emergency |
| 🚨 **High** | < 4 hours | Confirmed incident, significant impact |
| ⚡ **Medium** | < 24 hours | Important issue, no immediate danger |
| 📌 **Low** | < 72 hours | Minor issues, routine follow-ups |

#### Confidence Scoring

Each classification includes a confidence score (0-100%):

- **90-100%**: High confidence, auto-processed
- **70-89%**: Medium confidence, flagged for review
- **Below 70%**: Low confidence, requires human validation

---

### 3. Visual Evidence Analysis (LVM)

The Vision Language Model analyzes uploaded images to extract:

#### Detected Elements
- Equipment and machinery identification
- Environmental hazards (spills, damage, clutter)
- Safety equipment presence/absence
- Personnel positioning and PPE compliance

#### Output Metrics
- **Scene Type**: industrial_floor, office, warehouse, outdoor, etc.
- **Visual Severity**: none, low, medium, high, critical
- **Issue Hypotheses**: List of potential issues with confidence scores
- **Human Review Flag**: Automatic flagging for ambiguous images

#### Example Output

```json
{
  "visual_summary": "Industrial manufacturing floor with CNC machine showing oil leak near operator station",
  "detected_objects": ["cnc_machine", "oil_leak", "operator", "safety_barrier"],
  "scene_type": "industrial_floor",
  "potential_issue_detected": true,
  "issue_hypotheses": [
    {"issue_type": "maintenance", "confidence": 0.85},
    {"issue_type": "safety", "confidence": 0.65}
  ],
  "visual_severity_hint": "medium",
  "requires_human_review": true
}
```

---

### 4. Predictive SLA Engine

SmartClaim AI predicts resolution times using a hybrid approach:

#### Rule-Based Component
- Category-specific base SLAs
- Priority multipliers
- Visual severity adjustments
- Human review time additions

#### ML-Based Component
- Historical ticket analysis
- Department workload consideration
- Seasonal patterns recognition
- Complexity estimation

#### Output Metrics

| Metric | Description |
|--------|-------------|
| **Predicted Hours** | Estimated resolution time |
| **Breach Probability** | Risk of SLA violation (0-100%) |
| **Risk Level** | low / medium / high / critical |
| **Contributing Factors** | Explanation of prediction |

---

### 5. Role-Based Access Control

#### 👷 Worker Role

**Capabilities:**
- Submit new tickets with multimodal input
- View own ticket history and status
- Add comments to own tickets
- Chat with AI assistant

**Restrictions:**
- Cannot view other workers' tickets
- Cannot modify ticket classification
- Cannot access department analytics

#### 👔 Department Manager Role

**Capabilities:**
- View all tickets in managed department
- Assign tickets to team members
- Change ticket priority and status
- Access department analytics dashboard
- Generate department reports

**Restrictions:**
- Cannot view other departments' tickets
- Cannot modify user permissions
- Cannot access system configuration

#### 🛡️ Admin Role

**Capabilities:**
- Full system access across all departments
- User and department management
- System configuration and settings
- Cross-department analytics
- AI service health monitoring
- Audit log access

---

### 6. AI Chat Assistant

Context-aware chatbot with role-based responses:

#### For Workers
- Ticket submission guidance
- Policy information
- Status inquiries
- Reporting procedures

#### For Managers
- Performance insights
- Team recommendations
- SLA analysis
- Report generation assistance

#### For Admins
- System optimization suggestions
- Trend analysis
- Configuration guidance
- Strategic recommendations

#### RAG Integration
- Multi-tenant vector search
- Role-based context filtering
- Historical ticket reference
- Policy document retrieval

---

### 7. Dashboard & Analytics

#### Worker Dashboard
- My tickets overview
- Submission form
- Chat assistant
- Notification center

#### Department Manager Dashboard
- Department ticket queue
- Team performance metrics
- SLA compliance tracking
- Assignment workflow

#### Admin Dashboard
- System-wide analytics
- Department comparison
- AI service health
- User management
- Settings configuration

---

## 🔧 Technical Components

### AI Microservices Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     INPUT PROCESSING                             │
├─────────────────────────────────────────────────────────────────┤
│  Text → [Classifier] → Category, Priority, Summary               │
│  Image → [LVM] → Visual Evidence, Scene Type, Severity          │
│  Audio → [Transcriber] → Transcription, Language                │
│  Document → [Extractor] → Extracted Text, Tables                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGGREGATOR SERVICE                           │
├─────────────────────────────────────────────────────────────────┤
│  • Combine evidence from all sources                            │
│  • Apply weighted voting algorithm                               │
│  • Deduplicate and reconcile classifications                    │
│  • Generate unified summary                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OUTPUT GENERATION                            │
├─────────────────────────────────────────────────────────────────┤
│  → Final Classification (category + priority)                   │
│  → SLA Prediction (hours + breach risk)                         │
│  → Human Review Flags                                            │
│  → Unified Evidence Package                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Service Details

#### 1. Extractor Service (Port 8000)
- **Technology**: PaddleOCR, PyMuPDF, python-docx
- **Input**: PDF, DOCX, XLSX, CSV, Images
- **Output**: Extracted text, table data, page count

#### 2. Classifier Service (Port 8001)
- **Technology**: Google Gemini 2.5 Flash
- **Input**: Text description (FR/EN)
- **Output**: Category, priority, confidence, keywords

#### 3. Transcriber Service (Port 8002)
- **Technology**: VOSK (encoder) + Whisper (decoder)
- **Input**: Audio files (MP3, WAV, M4A)
- **Output**: Transcription, detected language, confidence

#### 4. Chat Service (Port 8003)
- **Technology**: Gemini + RAG integration
- **Input**: User message, role context, history
- **Output**: AI response, sources, confidence

#### 5. RAG Service (Port 8004)
- **Technology**: Qdrant, all-MiniLM-L6-v2
- **Input**: Query, user context
- **Output**: Relevant context, answer, sources

#### 6. LVM Service (Port 8005)
- **Technology**: Qwen 2.5 VL 7B via OpenRouter
- **Input**: Image (URL or base64)
- **Output**: Visual evidence, scene analysis

#### 7. Aggregator Service (Port 8006)
- **Technology**: Custom Python engine
- **Input**: Evidence from all services
- **Output**: Unified classification, SLA hints

#### 8. SLA Service (Port 8007)
- **Technology**: Rule engine + ML model
- **Input**: Classification, context
- **Output**: Predicted hours, breach probability

---

## 📊 Data Flow

### Ticket Submission Flow

```
User Input (Text/Image/Audio/Document)
            │
            ▼
    ┌───────────────┐
    │  Next.js API  │
    │    Routes     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────────────────────────────┐
    │         PARALLEL PROCESSING               │
    │  ┌─────────┐ ┌─────────┐ ┌─────────┐    │
    │  │Extractor│ │Transcrib│ │   LVM   │    │
    │  └────┬────┘ └────┬────┘ └────┬────┘    │
    └───────┼───────────┼───────────┼──────────┘
            │           │           │
            └───────────┼───────────┘
                        ▼
                ┌───────────────┐
                │  Aggregator   │
                │   Service     │
                └───────┬───────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │Classifier │ │    SLA    │ │    RAG    │
    │  Service  │ │  Service  │ │  Ingest   │
    └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                ┌───────────────┐
                │   Supabase    │
                │   Database    │
                └───────────────┘
```

---

## 🔒 Security Features

### Authentication
- Supabase Auth with JWT tokens
- Session management
- Secure password policies
- Multi-factor authentication (optional)

### Authorization
- Row-Level Security (RLS) policies
- Role-based access control
- Department-scoped data isolation
- API route protection

### Data Protection
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- Secure file storage
- Audit logging

---

## 📈 Performance Metrics

### Target SLAs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response** | < 200ms | P95 latency |
| **Classification** | < 3s | End-to-end |
| **Image Analysis** | < 10s | LVM processing |
| **Transcription** | < 30s | Per minute audio |
| **Search** | < 500ms | RAG query |

### Scalability

- Horizontal scaling via Docker/Kubernetes
- Load balancing support
- Database connection pooling
- CDN integration for static assets

---

## 🌐 Supported Languages

### User Interface
- English (en)
- French (fr)

### AI Processing
- French text classification
- English text classification
- Automatic language detection
- Bilingual transcription

---

## 📱 Platform Support

### Desktop Browsers
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

### Mobile Browsers
- iOS Safari 14+
- Android Chrome 90+

### Responsive Design
- Desktop-first approach
- Mobile-optimized dashboards
- Touch-friendly controls

---

<p align="center">
  <sub>© 2025-2026 SmartClaim AI. All Rights Reserved.</sub>
</p>
