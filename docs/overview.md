# Overview

SmartClaim AI is an enterprise-grade multimodal AI platform for industrial incident and non-conformity management. The system combines cutting-edge artificial intelligence with robust workflow management to streamline the entire lifecycle of workplace incidents, from initial report to final resolution.

## What is SmartClaim AI?

SmartClaim AI is a comprehensive platform designed specifically for industrial environments that need to:

- **Track and manage workplace incidents** including safety hazards, quality issues, equipment failures, and more
- **Automate ticket classification** using state-of-the-art AI models
- **Process multimodal evidence** including text, images, audio recordings, and documents
- **Predict resolution times** with AI-powered SLA estimation
- **Provide role-based workflows** for workers, managers, and administrators

## Target Industries

SmartClaim AI is designed for industries where incident management is critical:

- **Manufacturing**: Equipment failures, quality defects, safety incidents
- **Logistics & Warehousing**: Supply chain issues, inventory problems
- **Healthcare**: Non-conformities, equipment maintenance
- **Energy & Utilities**: Safety incidents, equipment monitoring
- **Construction**: Site safety, material defects

## Key Capabilities

### 1. Multimodal Input Processing

Accept evidence in multiple formats:
- **Text**: Free-form descriptions in French or English
- **Images**: Visual evidence of incidents (JPG, PNG, WebP)
- **Audio**: Voice recordings with automatic transcription
- **Documents**: PDF, Word, Excel, and more

### 2. AI-Powered Classification

Automatic ticket categorization:
- **Categories**: Safety, Quality, Maintenance, Logistics, HR, Other
- **Priorities**: Critical, High, Medium, Low
- **Confidence Scoring**: 0-100% accuracy indication

### 3. Visual Evidence Analysis

Vision Language Model (VLM) capabilities:
- Scene type identification
- Hazard detection
- Equipment recognition
- Severity assessment

### 4. Predictive SLA Engine

AI-powered resolution time prediction:
- Historical pattern analysis
- Category-based estimation
- Risk level assessment
- Breach probability calculation

### 5. Role-Based Access Control

Three-tier user system:
- **Workers**: Submit tickets, view own history
- **Managers**: Department oversight, assignments
- **Admins**: Full system access, configuration

### 6. AI Chat Assistant

Context-aware conversational support:
- Role-specific responses
- RAG-powered knowledge retrieval
- Ticket status inquiries
- Policy information

## Architecture Overview

SmartClaim AI consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│                   (Next.js 15.x)                            │
│     Dashboard • Ticket Forms • Chat • Analytics             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI SERVICES                               │
│              (8 Python Microservices)                        │
│  Extractor • Classifier • Transcriber • Chat • RAG          │
│  LVM • Aggregator • SLA                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│           Supabase (PostgreSQL) • Qdrant                    │
│     User Data • Tickets • Policies • Vector Store           │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 19, TypeScript, TailwindCSS |
| **Backend** | Next.js API Routes, Supabase Edge Functions |
| **AI Services** | Python, FastAPI, Google Gemini, Qwen VL |
| **Database** | PostgreSQL (Supabase), Qdrant (Vector) |
| **Infrastructure** | Docker, Docker Compose |

## Getting Started

Ready to get started? Check out these guides:

1. [Installation Guide](installation.md) - Set up SmartClaim AI
2. [Quick Start](quickstart.md) - Create your first ticket
3. [Features](features.md) - Explore all capabilities
