# Installation Guide

This guide covers the complete installation process for SmartClaim AI.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Docker** | 20.10+ | Container runtime |
| **Docker Compose** | 2.x+ | Service orchestration |
| **Node.js** | 20.x+ | Frontend runtime |
| **pnpm** | 9.x+ | Package manager |
| **Python** | 3.11+ | AI services |
| **Git** | 2.30+ | Version control |

### API Keys Required

| Service | Purpose | Required |
|---------|---------|----------|
| **Supabase** | Database & Auth | Yes |
| **Google AI (Gemini)** | LLM Classification | Yes |
| **OpenRouter** | Vision Language Model | Yes |
| **Qdrant** | Vector Database | Yes |

## Quick Start

For a rapid deployment, use the automated setup:

```bash
# Clone the repository
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI

# Run setup script
chmod +x setup.sh
./setup.sh
```

## Manual Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/WE2722/SmartClaim_AI.git
cd SmartClaim_AI
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies for AI services
cd python-services
pip install -r chat/requirements.txt
pip install -r classifier/requirements.txt
pip install -r extractor/requirements.txt
pip install -r transcriber/requirements.txt
```

### Step 3: Environment Configuration

Create environment files:

```bash
# Main application environment
cp apps/web/.env.example apps/web/.env.local

# AI services environment
cp python-services/.env.example python-services/.env
```

Edit `apps/web/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_SMARTCLAIM=true
```

Edit `python-services/.env`:

```env
# Google AI (Gemini)
GOOGLE_API_KEY=your_gemini_api_key

# OpenRouter (for Vision Language Model)
OPENROUTER_API_KEY=your_openrouter_api_key

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### Step 4: Database Setup

#### Option A: Local Supabase

```bash
# Start local Supabase
npx supabase start

# Run migrations
npx supabase db push
```

#### Option B: Cloud Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration SQL from `supabase/migrations/`
3. Update environment variables with cloud credentials

### Step 5: Start AI Services

```bash
cd python-services

# Using Docker Compose (recommended)
docker-compose up -d

# Or start services individually
python -m uvicorn extractor.app:app --host 0.0.0.0 --port 8000 &
python -m uvicorn classifier.app:app --host 0.0.0.0 --port 8001 &
python -m uvicorn transcriber.app:app --host 0.0.0.0 --port 8002 &
python -m uvicorn chat.app:app --host 0.0.0.0 --port 8003 &
```

### Step 6: Start Frontend

```bash
# Development mode
pnpm dev

# Production build
pnpm build
pnpm start
```

## Verification

### Check AI Services Health

```bash
# Test each service
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

### Access the Application

Open your browser and navigate to:

- **Local**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/home`

### Default Credentials

For development, use these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | See ADMIN_CREDENTIALS.md | See file |
| Worker | Test user required | Create in dashboard |

## Docker Deployment

For production, use the full Docker deployment:

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check if ports are in use
netstat -tulpn | grep -E ':(3000|8000|8001|8002|8003|6333)'

# Kill conflicting processes
kill -9 $(lsof -t -i:3000)
```

#### Docker Memory Issues

```bash
# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory > 8GB
```

#### Supabase Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://YOUR_PROJECT.supabase.co/rest/v1/"
```

#### AI Service Timeout

```bash
# Increase timeout in environment
AI_SERVICE_TIMEOUT=60000
```

## Next Steps

- [Quick Start Guide](quickstart.md) - Create your first ticket
- [Configuration](configuration.md) - Customize your deployment
- [Security Guide](security.md) - Secure your installation
