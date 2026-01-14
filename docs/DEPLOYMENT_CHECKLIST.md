# SmartClaim AI - Production Deployment Checklist

## Pre-Deployment Verification

**Version:** 1.0.0  
**Date:** January 2025  
**Environment:** Production

---

## 1. ENVIRONMENT CONFIGURATION

### 1.1 Required Environment Variables

| Variable | Service | Required | Status |
|----------|---------|----------|--------|
| `GEMINI_API_KEY` | Classifier, Chat, RAG | ✅ Yes | ⬜ Configured |
| `OPENROUTER_API_KEY` | LVM | ✅ Yes | ⬜ Configured |
| `SUPABASE_URL` | RAG, Frontend | ✅ Yes | ⬜ Configured |
| `SUPABASE_SERVICE_KEY` | RAG | ✅ Yes | ⬜ Configured |
| `SUPABASE_ANON_KEY` | Frontend | ✅ Yes | ⬜ Configured |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | ✅ Yes | ⬜ Configured |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | ✅ Yes | ⬜ Configured |

### 1.2 Service URLs (Production)

Update these URLs for your production environment:

```env
# Python Services (.env in python-services/)
GEMINI_API_KEY=your_production_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here

# Frontend (.env.local in apps/web/)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
CLASSIFIER_URL=http://classifier:8001
EXTRACTOR_URL=http://extractor:8000
CHAT_SERVICE_URL=http://chat:8002
LVM_API_URL=http://lvm:8005
```

---

## 2. SERVICE HEALTH CHECKS

### 2.1 Core Services

Execute each health check and mark as complete:

```bash
# Run these checks before deployment
```

| Service | Check Command | Expected | Status |
|---------|--------------|----------|--------|
| Extractor | `curl http://localhost:8000/health` | `{"status": "healthy"}` | ⬜ |
| Classifier | `curl http://localhost:8001/health` | `{"status": "healthy"}` | ⬜ |
| Chat | `curl http://localhost:8002/health` | `{"status": "healthy"}` | ⬜ |
| Transcriber | `curl http://localhost:8003/health` | `{"status": "healthy"}` | ⬜ |
| RAG | `curl http://localhost:8004/health` | `{"status": "healthy"}` | ⬜ |
| LVM | `curl http://localhost:8005/health` | `{"status": "healthy"}` | ⬜ |
| Aggregator | `curl http://localhost:8006/health` | `{"status": "healthy"}` | ⬜ |
| SLA | `curl http://localhost:8007/health` | `{"status": "healthy"}` | ⬜ |

### 2.2 Infrastructure Services

| Service | Check Command | Status |
|---------|--------------|--------|
| Qdrant | `curl http://localhost:6333/health` | ⬜ |
| Supabase API | `curl http://localhost:54321/rest/v1/` | ⬜ |
| PostgreSQL | `pg_isready -h localhost -p 54322` | ⬜ |
| Next.js | `curl http://localhost:3000/api/health` | ⬜ |

---

## 3. INTEGRATION TESTS

### 3.1 End-to-End Flow Tests

| Test | Description | Command | Status |
|------|-------------|---------|--------|
| Text Classification | Submit text, verify classification | See below | ⬜ |
| Image Analysis | Submit image, verify LVM analysis | See below | ⬜ |
| Voice Transcription | Submit audio, verify transcription | See below | ⬜ |
| RAG Query | Query chat, verify context retrieval | See below | ⬜ |
| SLA Prediction | Get SLA for ticket, verify prediction | See below | ⬜ |
| Full Pipeline | Text + Image → Aggregation → SLA | See below | ⬜ |

**Test Commands:**

```bash
# 1. Text Classification
curl -X POST http://localhost:8001/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Safety hazard detected in production area A"}'

# 2. LVM Image Analysis
curl -X POST http://localhost:8005/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800"}'

# 3. SLA Prediction
curl -X POST http://localhost:8007/predict \
  -H "Content-Type: application/json" \
  -d '{"category": "safety", "priority": "high", "has_visual_evidence": true}'

# 4. Full Pipeline (Aggregation)
curl -X POST http://localhost:8006/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "text_evidence": {
      "category": "safety",
      "priority": "high",
      "summary": "Safety incident reported",
      "confidence": 0.9,
      "keywords": ["safety", "incident"]
    }
  }'
```

---

## 4. DATABASE VERIFICATION

### 4.1 Schema Check

| Table | Exists | RLS Enabled | Status |
|-------|--------|-------------|--------|
| `user_profiles` | ⬜ | ⬜ | ⬜ |
| `departments` | ⬜ | ⬜ | ⬜ |
| `tickets` | ⬜ | ⬜ | ⬜ |
| `ticket_attachments` | ⬜ | ⬜ | ⬜ |
| `ticket_activities` | ⬜ | ⬜ | ⬜ |
| `ticket_metrics` | ⬜ | ⬜ | ⬜ |
| `knowledge_base` | ⬜ | ⬜ | ⬜ |
| `chat_sessions` | ⬜ | ⬜ | ⬜ |

### 4.2 Initial Data

| Data | Required | Status |
|------|----------|--------|
| Departments seeded | ✅ Yes | ⬜ |
| Admin user created | ✅ Yes | ⬜ |
| Test tickets (staging) | Optional | ⬜ |

---

## 5. SECURITY CHECKLIST

### 5.1 API Security

| Check | Status |
|-------|--------|
| API keys not hardcoded in source | ⬜ |
| CORS configured for production domain | ⬜ |
| Rate limiting configured | ⬜ |
| Authentication required on all routes | ⬜ |
| Input validation on all endpoints | ⬜ |

### 5.2 Infrastructure Security

| Check | Status |
|-------|--------|
| HTTPS enabled | ⬜ |
| Database connections encrypted | ⬜ |
| Service-to-service auth (internal) | ⬜ |
| Secrets in secure vault/env | ⬜ |
| No exposed admin ports | ⬜ |

---

## 6. MONITORING & OBSERVABILITY

### 6.1 Logging

| Check | Status |
|-------|--------|
| Structured logging enabled | ⬜ |
| Log aggregation configured | ⬜ |
| Error alerting configured | ⬜ |

### 6.2 Metrics

| Metric | Dashboard | Alerting | Status |
|--------|-----------|----------|--------|
| Request latency | ⬜ | ⬜ | ⬜ |
| Error rate | ⬜ | ⬜ | ⬜ |
| Container memory | ⬜ | ⬜ | ⬜ |
| API call counts | ⬜ | ⬜ | ⬜ |
| External API usage (Gemini/OpenRouter) | ⬜ | ⬜ | ⬜ |

---

## 7. ROLLBACK PLAN

### 7.1 Rollback Triggers

- [ ] Error rate > 10% for 5 minutes
- [ ] P50 latency > 5 seconds
- [ ] Critical service unhealthy for 2 minutes
- [ ] Database connection failures

### 7.2 Rollback Steps

```bash
# 1. Stop current deployment
docker compose down

# 2. Restore previous image
docker compose -f docker-compose.rollback.yml up -d

# 3. Verify health
./scripts/verify-health.sh

# 4. Notify stakeholders
echo "Rollback complete - investigating issues"
```

---

## 8. GO-LIVE SEQUENCE

### 8.1 Deployment Order

1. ⬜ **Infrastructure Services**
   - Qdrant (vector database)
   - PostgreSQL (Supabase)

2. ⬜ **Core AI Services**
   - Extractor
   - Classifier
   - Transcriber
   - LVM

3. ⬜ **Integration Services**
   - RAG
   - Aggregator
   - SLA Predictor
   - Chat

4. ⬜ **Frontend**
   - Next.js application

### 8.2 Go-Live Commands

```bash
# 1. Build all services
cd python-services
docker compose build

# 2. Start infrastructure
docker compose up -d qdrant

# 3. Wait for Qdrant
sleep 10

# 4. Start all services
docker compose up -d

# 5. Verify all healthy
for port in 8000 8001 8002 8003 8004 8005 8006 8007; do
  echo "Checking :$port"
  curl -s http://localhost:$port/health | jq .status
done

# 6. Start frontend
cd ../apps/web
pnpm run build
pnpm run start
```

---

## 9. POST-DEPLOYMENT VERIFICATION

### 9.1 Smoke Tests (5 minutes post-deploy)

| Test | Description | Status |
|------|-------------|--------|
| User login | Admin can log in | ⬜ |
| Create ticket (text) | Submit text ticket | ⬜ |
| Create ticket (image) | Submit ticket with image | ⬜ |
| Chat assistant | Ask question, get response | ⬜ |
| Dashboard loads | Admin dashboard renders | ⬜ |

### 9.2 Performance Baseline

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Classification latency | < 3s | _____ | ⬜ |
| LVM analysis latency | < 10s | _____ | ⬜ |
| Chat response latency | < 5s | _____ | ⬜ |
| SLA prediction latency | < 500ms | _____ | ⬜ |
| Page load time | < 2s | _____ | ⬜ |

---

## 10. SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | ⬜ |
| QA Lead | | | ⬜ |
| Security Review | | | ⬜ |
| Product Owner | | | ⬜ |

---

## APPENDIX A: Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (Next.js)                    │   │
│  │                      Port: 3000                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              ▼               ▼               ▼                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Extractor   │  │  Classifier   │  │    Chat       │      │
│  │   Port 8000   │  │   Port 8001   │  │  Port 8002    │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
│                              │               │                  │
│  ┌───────────────┐          │               │                  │
│  │  Transcriber  │          │               ▼                  │
│  │   Port 8003   │          │      ┌───────────────┐          │
│  └───────────────┘          │      │     RAG       │          │
│                              │      │  Port 8004    │          │
│  ┌───────────────┐          │      └───────────────┘          │
│  │     LVM       │          │               │                  │
│  │   Port 8005   │──────────┼───────────────┘                  │
│  └───────────────┘          │                                  │
│          │                  ▼                                  │
│          │         ┌───────────────┐                          │
│          └────────▶│  Aggregator   │                          │
│                    │  Port 8006    │                          │
│                    └───────────────┘                          │
│                             │                                  │
│                             ▼                                  │
│                    ┌───────────────┐                          │
│                    │ SLA Predictor │                          │
│                    │  Port 8007    │                          │
│                    └───────────────┘                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DATA LAYER                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │   Qdrant    │  │  Supabase   │  │   PostgreSQL    │  │   │
│  │  │  Port 6333  │  │  Port 54321 │  │   Port 54322    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Checklist Version:** 1.0.0  
**Last Updated:** January 2025
