# 📖 SmartClaim AI - Installation Guide

> **⚠️ PROPRIETARY SOFTWARE**: This installation guide is for authorized users only.
> Unauthorized installation or use is strictly prohibited. See [LICENSE](LICENSE).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Quick Start (Development)](#quick-start-development)
4. [Full Installation](#full-installation)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [AI Services Deployment](#ai-services-deployment)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|-----------------|---------|
| **Docker** | 24.0+ | Container runtime |
| **Docker Compose** | 2.20+ | Container orchestration |
| **Node.js** | 20.x LTS | Frontend runtime |
| **pnpm** | 8.0+ | Package manager |
| **Python** | 3.11+ | AI services runtime |
| **Git** | 2.40+ | Version control |

### Required API Keys

You will need the following API keys:

1. **Google Gemini API Key**
   - Get it from: [Google AI Studio](https://aistudio.google.com/apikey)
   - Used by: Classifier, Chat Assistant

2. **OpenRouter API Key**
   - Get it from: [OpenRouter](https://openrouter.ai/keys)
   - Used by: LVM Vision Analyzer

3. **Supabase Credentials**
   - Project URL and anon key from your Supabase project
   - Service role key for backend operations

---

## System Requirements

### Minimum Requirements (Development)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 50 GB SSD | 100 GB NVMe |
| **Network** | 10 Mbps | 100 Mbps |

### Minimum Requirements (Production)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 16 cores | 32+ cores |
| **RAM** | 64 GB | 128 GB |
| **Storage** | 500 GB NVMe | 1 TB NVMe |
| **Network** | 1 Gbps | 10 Gbps |
| **GPU** | - | NVIDIA T4/A10 (optional) |

---

## Quick Start (Development)

For a quick local development setup:

```bash
# 1. Clone the repository (requires authorization)
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI

# 2. Copy environment templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local

# 3. Install Node.js dependencies
pnpm install

# 4. Start Supabase locally (requires Docker)
pnpm supabase:start

# 5. Run database migrations
pnpm supabase:migrate

# 6. Start the development server
pnpm dev

# 7. In a separate terminal, start AI services
cd python-services
docker compose up -d
```

The application will be available at: `http://localhost:3000`

---

## Full Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI
```

### Step 2: Environment Configuration

Create the main environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ==============================================
# SUPABASE CONFIGURATION
# ==============================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ==============================================
# AI SERVICES CONFIGURATION
# ==============================================
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# ==============================================
# SERVICES URLS (Default Docker network)
# ==============================================
EXTRACTOR_URL=http://localhost:8000
CLASSIFIER_URL=http://localhost:8001
TRANSCRIBER_URL=http://localhost:8002
CHAT_URL=http://localhost:8003
RAG_URL=http://localhost:8004
LVM_URL=http://localhost:8005
AGGREGATOR_URL=http://localhost:8006
SLA_URL=http://localhost:8007

# ==============================================
# VECTOR DATABASE (QDRANT)
# ==============================================
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional for local development
```

Create the web app environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

### Step 3: Install Dependencies

```bash
# Install all Node.js dependencies
pnpm install

# Install Python dependencies (for local development without Docker)
cd python-services
pip install -r requirements.txt
cd ..
```

### Step 4: Database Setup

#### Option A: Local Supabase (Recommended for Development)

```bash
# Start local Supabase
pnpm supabase:start

# Apply migrations
pnpm supabase:migrate

# Seed initial data (optional)
pnpm supabase:seed
```

#### Option B: Cloud Supabase (Production)

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the project URL and keys to your `.env` file
3. Apply migrations:

```bash
npx supabase db push --linked
```

### Step 5: Start AI Services

```bash
cd python-services

# Start all services with Docker Compose
docker compose up -d

# Verify all services are running
docker compose ps

# Check service health
curl http://localhost:8000/health  # Extractor
curl http://localhost:8001/health  # Classifier
curl http://localhost:8002/health  # Transcriber
curl http://localhost:8003/health  # Chat
curl http://localhost:8004/health  # RAG
curl http://localhost:8005/health  # LVM
curl http://localhost:8006/health  # Aggregator
curl http://localhost:8007/health  # SLA
```

### Step 6: Start the Application

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## Configuration

### Environment Variables Reference

#### Core Application

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |

#### AI Services

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter API key | ✅ |

#### Vector Database

| Variable | Description | Default |
|----------|-------------|---------|
| `QDRANT_URL` | Qdrant server URL | `http://localhost:6333` |
| `QDRANT_API_KEY` | Qdrant API key | - |
| `QDRANT_COLLECTION` | Collection name | `smartclaim_tickets` |

---

## Database Setup

### Schema Overview

The SmartClaim database consists of the following main tables:

```sql
-- Core Tables
├── profiles          -- User profiles (extends auth.users)
├── departments       -- Organization departments
├── tickets           -- Main incident/claim records
├── ticket_comments   -- Ticket discussion threads
├── ticket_history    -- Audit trail for ticket changes
└── ticket_files      -- File attachments
```

### Running Migrations

```bash
# Apply all pending migrations
pnpm supabase:migrate

# Create a new migration
pnpm supabase:migration:new migration_name

# Reset database (CAUTION: Deletes all data)
pnpm supabase:reset
```

### Seed Data

To populate the database with test data:

```bash
pnpm supabase:seed
```

This creates:
- 5 departments (Safety, Quality, Maintenance, Logistics, HR)
- Test users with different roles
- Sample tickets for testing

---

## AI Services Deployment

### Docker Compose Services

The `python-services/docker-compose.yml` defines all AI microservices:

```yaml
services:
  extractor:    # Port 8000 - Document text extraction
  classifier:   # Port 8001 - Ticket classification
  transcriber:  # Port 8002 - Audio transcription
  chat:         # Port 8003 - Chat assistant
  rag:          # Port 8004 - RAG service
  lvm:          # Port 8005 - Vision analysis
  aggregator:   # Port 8006 - Evidence aggregation
  sla:          # Port 8007 - SLA prediction
  qdrant:       # Port 6333 - Vector database
```

### Service Management

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f [service_name]

# Restart a specific service
docker compose restart classifier

# Stop all services
docker compose down

# Rebuild services
docker compose build --no-cache
```

### GPU Support (Optional)

To enable GPU acceleration for Whisper:

```yaml
# In docker-compose.yml
transcriber:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

---

## Verification

### Health Check Script

Run the verification script to check all components:

```bash
# Check all services
python python-services/health_check.py

# Or manually check each service
curl http://localhost:8000/health | jq
curl http://localhost:8001/health | jq
curl http://localhost:8002/health | jq
curl http://localhost:8003/health | jq
curl http://localhost:8004/health | jq
curl http://localhost:8005/health | jq
curl http://localhost:8006/health | jq
curl http://localhost:8007/health | jq
```

### Test the Pipeline

```python
import requests

# Test classifier
response = requests.post(
    "http://localhost:8001/classify",
    json={"text": "Machine making unusual noise on floor B"}
)
print(response.json())

# Test LVM
response = requests.post(
    "http://localhost:8005/analyze",
    json={"image_url": "data:image/jpeg;base64,/9j/4AAQ..."}
)
print(response.json())
```

---

## Troubleshooting

### Common Issues

#### Docker Services Won't Start

```bash
# Check Docker is running
docker info

# Check port availability
netstat -an | findstr "8000 8001 8002"

# View service logs
docker compose logs classifier --tail 100
```

#### Database Connection Failed

```bash
# Verify Supabase is running
pnpm supabase:status

# Check connection string
psql $DATABASE_URL -c "SELECT 1"
```

#### API Key Issues

```bash
# Test Gemini API
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# Test OpenRouter
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

#### Memory Issues

```bash
# Increase Docker memory limit
# Edit Docker Desktop settings or:
export DOCKER_MEMORY_LIMIT=8g

# Reduce Whisper model size
# In transcriber/Dockerfile, use "small" instead of "medium"
```

### Getting Help

For authorized users experiencing issues:

1. Check the [documentation](docs/)
2. Review [common issues](docs/troubleshooting.md)
3. Contact: support@smartclaim.ai

---

## Next Steps

After successful installation:

1. 📖 Read the [App Description](APP_DESCRIPTION.md) to understand features
2. 🔧 Review the [API Reference](docs/api-reference.md)
3. 🎨 Explore the [User Guide](docs/user-guide.md)

---

<p align="center">
  <sub>© 2025-2026 SmartClaim AI. All Rights Reserved.</sub>
</p>
