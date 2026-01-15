<p align="center">
  <img src="docs/assets/smartclaim-banner.png" alt="SmartClaim AI Banner" width="800"/>
</p>

<h1 align="center">🏭 SmartClaim AI</h1>

<p align="center">
  <strong>Enterprise-Grade Multimodal AI Platform for Industrial Incident Management</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version"/>
  <img src="https://img.shields.io/badge/python-3.11+-green.svg" alt="Python"/>
  <img src="https://img.shields.io/badge/Next.js-15.x-black.svg" alt="Next.js"/>
  <img src="https://img.shields.io/badge/license-Proprietary-red.svg" alt="License"/>
  <img src="https://img.shields.io/badge/status-Production-success.svg" alt="Status"/>
</p>

---

## 📋 Overview

**SmartClaim AI** is a comprehensive, enterprise-grade platform designed for managing workplace non-conformities, incidents, and claims in industrial environments. The system leverages cutting-edge multimodal AI to process text, images, audio, and documents, providing intelligent classification, risk assessment, and predictive SLA management.

### 🎯 Key Capabilities

- **Multimodal Input Processing**: Accept and analyze text descriptions, images, voice recordings, and documents
- **AI-Powered Classification**: Automatic categorization with confidence scoring and human review flagging
- **Visual Evidence Analysis**: Industrial scene understanding using Vision Language Models (VLM)
- **Predictive SLA Engine**: Hybrid rule-based + ML approach for accurate resolution time prediction
- **Multi-Tenant RAG System**: Role-based context retrieval with strict data isolation
- **Real-Time Dashboard**: Live monitoring with department-specific views and analytics

---

## ✨ Features

### 🤖 AI Microservices Architecture

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **Extractor** | 8000 | PaddleOCR | Multi-format document text extraction with OCR |
| **Classifier** | 8001 | Gemini 2.5 Flash | Intelligent ticket classification (6 categories, 4 priorities) |
| **Transcriber** | 8002 | Whisper + VOSK | Two-stage ASR pipeline for voice transcription |
| **Chat Assistant** | 8003 | Gemini + RAG | Context-aware conversational AI |
| **RAG Service** | 8004 | Qdrant + Embeddings | Multi-tenant vector search with role-based filtering |
| **LVM Analyzer** | 8005 | Qwen 2.5 VL 7B | Industrial image analysis and visual evidence extraction |
| **Aggregator** | 8006 | Python | Multimodal evidence fusion with weighted voting |
| **SLA Predictor** | 8007 | Hybrid ML/Rules | Breach probability and resolution time prediction |

### 🔐 Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN                                     │
│  • Full system access                                           │
│  • Cross-department analytics                                   │
│  • User & department management                                 │
├─────────────────────────────────────────────────────────────────┤
│                   DEPARTMENT MANAGER                            │
│  • Department-scoped ticket access                              │
│  • Team performance monitoring                                  │
│  • Ticket assignment & SLA tracking                             │
├─────────────────────────────────────────────────────────────────┤
│                        WORKER                                    │
│  • Submit new tickets                                           │
│  • View own ticket history                                      │
│  • Chat assistant access                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 📊 Classification Categories

| Category | Description | Example Incidents |
|----------|-------------|-------------------|
| 🔴 **Safety** | Physical hazards, injuries, emergencies | Burns, falls, chemical exposure |
| 🟠 **Quality** | Product defects, process deviations | Specification failures, defects |
| 🔵 **Maintenance** | Equipment issues, facility repairs | Machine malfunctions, wear |
| 🟢 **Logistics** | Supply chain, inventory problems | Delivery delays, shortages |
| 🟣 **HR** | Employee relations, conduct issues | Policy violations, disputes |
| ⚪ **Other** | Uncategorized issues | General inquiries |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │ Mobile App  │  │     API     │  │   Webhooks  │        │
│  │  (Next.js)  │  │  (Future)   │  │   Clients   │  │             │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js API Routes + Middleware                   │   │
│  │              Authentication • Rate Limiting • Validation             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   EXTRACTOR      │    │   TRANSCRIBER    │    │   LVM ANALYZER   │
│   Port: 8000     │    │   Port: 8002     │    │   Port: 8005     │
│   ─────────────  │    │   ─────────────  │    │   ─────────────  │
│   • PaddleOCR    │    │   • VOSK         │    │   • Qwen 2.5 VL  │
│   • PDF/DOCX     │    │   • Whisper      │    │   • OpenRouter   │
│   • CSV/Excel    │    │   • Multi-lang   │    │   • Scene Det.   │
└────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGGREGATOR SERVICE                                  │
│                            Port: 8006                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Multimodal Evidence Fusion Engine                       │   │
│  │         Weighted Voting • Confidence Calibration • Deduplication     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   CLASSIFIER     │  │   SLA PREDICTOR  │  │   RAG SERVICE    │
│   Port: 8001     │  │   Port: 8007     │  │   Port: 8004     │
│   ─────────────  │  │   ─────────────  │  │   ─────────────  │
│   • Gemini 2.5   │  │   • Hybrid ML    │  │   • Qdrant       │
│   • 6 Categories │  │   • Rule Engine  │  │   • Multi-tenant │
│   • Bilingual    │  │   • Breach Risk  │  │   • Embeddings   │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  ┌─────────────────────┐              ┌─────────────────────┐               │
│  │   PostgreSQL        │              │   Qdrant Vector DB  │               │
│  │   (Supabase)        │              │                     │               │
│  │   ───────────────   │              │   ───────────────   │               │
│  │   • Users/Roles     │              │   • Ticket Vectors  │               │
│  │   • Tickets         │              │   • Semantic Search │               │
│  │   • Departments     │              │   • Role Filtering  │               │
│  │   • Audit Logs      │              │                     │               │
│  └─────────────────────┘              └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

> ⚠️ **Important**: This software is proprietary and requires explicit authorization. See [LICENSE](LICENSE) for details.

### Prerequisites

- **Docker** & **Docker Compose** v2.0+
- **Node.js** 20.x+ with **pnpm**
- **Python** 3.11+
- **Supabase** account (or local instance)
- **API Keys**: Gemini API, OpenRouter API

### Installation

Please refer to the detailed [Installation Guide](INSTALLATION.md) for complete setup instructions.

```bash
# Clone the repository (requires authorization)
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI

# See INSTALLATION.md for detailed setup steps
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📖 Installation Guide](INSTALLATION.md) | Complete setup and deployment instructions |
| [📋 App Description](APP_DESCRIPTION.md) | Detailed feature documentation |
| [🔧 API Reference](docs/api-reference.md) | REST API endpoints and schemas |
| [🏗 Architecture](docs/architecture.md) | System design and component details |

### Read the Docs

Full documentation is available at: **[smartclaim-ai.readthedocs.io](https://smartclaim-ai.readthedocs.io)**

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15.x with App Router
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Authentication**: Supabase Auth

### Backend
- **API Layer**: Next.js API Routes + FastAPI microservices
- **Database**: PostgreSQL (Supabase)
- **Vector Store**: Qdrant
- **Caching**: Redis (optional)

### AI/ML
- **LLM**: Google Gemini 2.5 Flash
- **VLM**: Qwen 2.5 VL 7B (via OpenRouter)
- **ASR**: Whisper + VOSK
- **OCR**: PaddleOCR
- **Embeddings**: all-MiniLM-L6-v2

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

---

## 📁 Project Structure

```
SmartClaim_AI/
├── apps/
│   ├── web/                    # Next.js frontend application
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities and hooks
│   └── e2e/                   # End-to-end tests
├── packages/
│   ├── features/              # Feature modules
│   │   ├── smartclaim/        # Core SmartClaim features
│   │   ├── auth/              # Authentication
│   │   └── accounts/          # Account management
│   ├── ui/                    # Shared UI components
│   ├── supabase/              # Database client
│   └── shared/                # Shared utilities
├── python-services/           # AI microservices
│   ├── extractor/             # Document extraction (8000)
│   ├── classifier/            # Text classification (8001)
│   ├── transcriber/           # Audio transcription (8002)
│   ├── chat/                  # Chat assistant (8003)
│   ├── rag/                   # RAG service (8004)
│   ├── lvm/                   # Vision analysis (8005)
│   ├── aggregator/            # Evidence fusion (8006)
│   └── sla/                   # SLA prediction (8007)
├── supabase/
│   ├── migrations/            # Database migrations
│   └── config.toml            # Supabase configuration
├── docs/                      # Documentation
└── docker-compose.yml         # Container orchestration
```

---

## 🔒 Security

SmartClaim AI implements enterprise-grade security:

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row-Level Security (RLS) policies
- **Data Isolation**: Multi-tenant architecture with strict boundaries
- **Encryption**: TLS 1.3 for transit, AES-256 for storage
- **Audit Logging**: Comprehensive activity tracking
- **Input Validation**: Schema validation on all endpoints

---

## 📄 License

**⚠️ PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

This software is the exclusive property of the SmartClaim AI development team. 

- ❌ **NO** commercial use
- ❌ **NO** personal use
- ❌ **NO** modification
- ❌ **NO** distribution
- ❌ **NO** reverse engineering

See [LICENSE](LICENSE) for the complete license agreement.

---

## 👥 Authors

**SmartClaim AI Development Team**

- **Wiame EL HAFID & Houssam RJILI** - Lead Developers & System Architects

---

## 📞 Contact

For licensing inquiries or authorized access requests:

- 📧 Email: contact@smartclaim.ai
- 🔗 GitHub: [@WE2722](https://github.com/WE2722) and [@HxRjili](https://github.com/HxRjili)

---

<p align="center">
  <sub>Built with ❤️ for industrial safety and efficiency</sub>
</p>

<p align="center">
  <sub>© 2025-2026 SmartClaim AI. All Rights Reserved.</sub>
</p>
