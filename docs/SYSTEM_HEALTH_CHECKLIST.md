# SmartClaim AI - System Health Checklist

## Phase 1: System Health & Integration Verification

**Date:** January 2025  
**Status:** Active Production Validation  
**Architect:** Principal AI Systems Architect

---

## 1. SERVICE HEALTH STATUS

### 1.1 Core Services

| Service | Port | Protocol | Health Endpoint | Expected Response | Status |
|---------|------|----------|-----------------|-------------------|--------|
| **Extractor** | 8000 | HTTP | `/health` | `{"status": "ok"}` | 🟡 Needs Check |
| **Classifier** | 8001 | HTTP | `/health` | `{"status": "ok"}` | 🟡 Needs Check |
| **Chat** | 8002 | HTTP | `/health` | `{"status": "ok"}` | 🟡 Needs Check |
| **Transcriber** | 8003 | HTTP | `/health` | `{"status": "ok"}` | 🟡 Needs Check |
| **RAG** | 8004 | HTTP | `/health` | `{"status": "healthy", ...}` | 🟡 Needs Check |
| **LVM** | 8005 | HTTP | `/health` | `{"status": "healthy", ...}` | ✅ Verified |

### 1.2 Infrastructure Services

| Service | Port | Protocol | Status |
|---------|------|----------|--------|
| **Qdrant (Vector DB)** | 6333 | HTTP/gRPC | 🟡 Needs Check |
| **Supabase (API)** | 54321 | HTTP | 🟡 Needs Check |
| **Supabase (Studio)** | 54323 | HTTP | 🟡 Needs Check |
| **PostgreSQL** | 54322 | TCP | 🟡 Needs Check |
| **Next.js (Web)** | 3000 | HTTP | ✅ Running |

---

## 2. DATA FLOW VALIDATION

### 2.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SMARTCLAIM MULTIMODAL PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────┐     ┌─────────────┐     ┌────────────┐     ┌──────────────┐       │
│  │  TEXT   │────▶│  EXTRACTOR  │────▶│ CLASSIFIER │────▶│   SUPABASE   │       │
│  │ Input   │     │  (8000)     │     │  (8001)    │     │  (Database)  │       │
│  └─────────┘     └─────────────┘     └────────────┘     └──────────────┘       │
│                                             │                                   │
│  ┌─────────┐                                ▼                                   │
│  │  FILE   │────▶ Extractor ────▶ text ────▶ Classifier ────▶ ticket_data      │
│  │ Upload  │                                                                    │
│  └─────────┘                                                                    │
│                                                                                 │
│  ┌─────────┐     ┌─────────────┐                                               │
│  │  VOICE  │────▶│ TRANSCRIBER │────▶ text ────▶ Classifier ────▶ ticket_data  │
│  │ Input   │     │   (8003)    │                                               │
│  └─────────┘     └─────────────┘                                               │
│                                                                                 │
│  ┌─────────┐     ┌─────────────┐     ┌────────────┐                            │
│  │  IMAGE  │────▶│    LVM      │────▶│ AGGREGATOR │────▶ enhanced_evidence     │
│  │ Input   │     │   (8005)    │     │  (TBD)     │                            │
│  └─────────┘     └─────────────┘     └────────────┘                            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                      RAG LAYER (8004)                                │       │
│  │  ┌────────┐     ┌────────────┐     ┌─────────┐     ┌────────────┐   │       │
│  │  │ Query  │────▶│  Embedding │────▶│ Qdrant  │────▶│  Context   │   │       │
│  │  │        │     │  (Gemini)  │     │ (6333)  │     │  Builder   │   │       │
│  │  └────────┘     └────────────┘     └─────────┘     └────────────┘   │       │
│  │                                                            │        │       │
│  │                                                            ▼        │       │
│  │  ┌────────────────────────────────────────────────────────────────┐│       │
│  │  │                    CHAT SERVICE (8002)                         ││       │
│  │  │                   Gemini 2.5 Flash + RAG                       ││       │
│  │  └────────────────────────────────────────────────────────────────┘│       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Schema Contract Validation

| Source → Target | Contract | Status | Issue |
|-----------------|----------|--------|-------|
| Extractor → Classifier | `{text: string, metadata: object}` | ✅ Valid | - |
| Classifier → Frontend | `{category, priority, summary, confidence, suggested_department, keywords}` | ✅ Valid | - |
| Transcriber → Classifier | `{text: string}` | ✅ Valid | - |
| LVM → Aggregator | `LVMOutput` JSON schema | ⚠️ No Aggregator | Missing component |
| RAG → Chat | `{answer: string, sources: array}` | ✅ Valid | - |
| Chat → Frontend | `{message, sources, confidence}` | ✅ Valid | - |

---

## 3. CRITICAL INTEGRATION POINTS

### 3.1 Environment Variables

| Variable | Service | Required | Default Present | Risk |
|----------|---------|----------|-----------------|------|
| `GEMINI_API_KEY` | Classifier, Chat, RAG | ✅ Yes | ⚠️ Hardcoded | **HIGH** - Exposed in source |
| `OPENROUTER_API_KEY` | LVM | ✅ Yes | ❌ No | **HIGH** - Will fail |
| `SUPABASE_SERVICE_KEY` | RAG | ✅ Yes | ❌ No | **MEDIUM** - RAG degraded |
| `SUPABASE_URL` | RAG | ✅ Yes | ✅ Default | OK |
| `QDRANT_HOST` | RAG | ✅ Yes | ✅ Default | OK |

### 3.2 Cross-Service Communication

| From | To | Method | Timeout | Retry | Circuit Breaker |
|------|-----|--------|---------|-------|-----------------|
| Frontend | Extractor | HTTP POST | ❌ None | ❌ No | ❌ No |
| Frontend | Classifier | HTTP POST | ❌ None | ❌ No | ❌ No |
| Frontend | Chat | HTTP POST | ❌ None | ❌ No | ❌ No |
| Frontend | LVM | HTTP POST | ❌ None | ❌ No | ❌ No |
| Chat | RAG | HTTP POST | 30s | ❌ No | ❌ No |
| RAG | Qdrant | HTTP | ❌ None | ❌ No | ❌ No |
| LVM | OpenRouter | HTTP POST | 60s | ✅ 3x | ❌ No |

---

## 4. ERROR HANDLING ASSESSMENT

### 4.1 Service-Level Error Handling

| Service | Try-Catch | Logging | Error Response | Graceful Degradation |
|---------|-----------|---------|----------------|---------------------|
| Extractor | ✅ Yes | ✅ Yes | ⚠️ Generic | ❌ No |
| Classifier | ✅ Yes | ✅ Yes | ⚠️ Generic | ❌ No |
| Chat | ✅ Yes | ✅ Yes | ⚠️ Generic | ⚠️ Partial |
| Transcriber | ✅ Yes | ✅ Yes | ⚠️ Generic | ⚠️ Partial |
| RAG | ✅ Yes | ✅ Yes | ⚠️ Generic | ❌ No |
| LVM | ✅ Yes | ✅ Yes | ✅ Detailed | ✅ Yes |

### 4.2 Frontend Error Handling

| Route | Error Boundary | User Feedback | Retry UI | Status |
|-------|---------------|---------------|----------|--------|
| `/api/smartclaim/classify` | ✅ | ⚠️ Generic | ❌ | Needs Improvement |
| `/api/smartclaim/extract` | ✅ | ⚠️ Generic | ❌ | Needs Improvement |
| `/api/smartclaim/chat` | ✅ | ⚠️ Generic | ❌ | Needs Improvement |
| `/api/smartclaim/lvm/analyze` | ✅ | ✅ Detailed | ❌ | Good |

---

## 5. VALIDATION COMMANDS

### 5.1 Service Health Checks

```bash
# All services health check
curl -s http://localhost:8000/health  # Extractor
curl -s http://localhost:8001/health  # Classifier (no health endpoint - needs fix)
curl -s http://localhost:8002/health  # Chat (no health endpoint - needs fix)
curl -s http://localhost:8003/health  # Transcriber (no health endpoint - needs fix)
curl -s http://localhost:8004/health  # RAG
curl -s http://localhost:8005/health  # LVM

# Qdrant
curl -s http://localhost:6333/health

# Supabase
curl -s http://localhost:54321/rest/v1/  # With auth header
```

### 5.2 Integration Tests

```bash
# Test Extractor with file
curl -X POST http://localhost:8000/extract -F "file=@test.pdf"

# Test Classifier
curl -X POST http://localhost:8001/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Machine breakdown in production line A"}'

# Test LVM
curl -X POST http://localhost:8005/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/image.jpg"}'

# Test RAG Query
curl -X POST http://localhost:8004/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How to report safety incident?", "user_context": {"user_id": "test", "role": "worker"}}'
```

---

## 6. KNOWN ISSUES LOG

| ID | Severity | Component | Issue | Impact | Remediation |
|----|----------|-----------|-------|--------|-------------|
| SC-001 | 🔴 CRITICAL | Classifier | API key hardcoded in source | Security breach | Move to env var |
| SC-002 | 🔴 CRITICAL | Chat | API key hardcoded in source | Security breach | Move to env var |
| SC-003 | 🟠 HIGH | All Services | Missing health endpoints | No monitoring | Add /health endpoints |
| SC-004 | 🟠 HIGH | Frontend→Backend | No request timeouts | Hung requests | Add timeouts |
| SC-005 | 🟠 HIGH | LVM | No aggregation layer | LVM isolated | Implement aggregator |
| SC-006 | 🟡 MEDIUM | All Services | No circuit breakers | Cascade failures | Add resilience |
| SC-007 | 🟡 MEDIUM | RAG | Missing Supabase key | RAG degraded | Configure env |
| SC-008 | 🟢 LOW | Error Handling | Generic error messages | Poor UX | Improve messages |

---

## 7. RECOMMENDATIONS

### 7.1 Immediate Actions (Before LVM Testing)

1. **[CRITICAL]** Remove hardcoded API keys from classifier/app.py and chat/app.py
2. **[HIGH]** Add health endpoints to Classifier, Chat, Transcriber services
3. **[HIGH]** Configure request timeouts in all Next.js API routes
4. **[HIGH]** Verify OPENROUTER_API_KEY is set for LVM service

### 7.2 Short-Term Improvements

1. Implement multimodal evidence aggregation layer (LVM + Text + Audio)
2. Add circuit breakers for external API calls (Gemini, OpenRouter)
3. Implement structured logging with correlation IDs
4. Add metrics collection (Prometheus/OpenTelemetry)

### 7.3 Long-Term Architecture

1. Implement Predictive SLA module (Phase 3)
2. Add webhook notifications for ticket updates
3. Implement caching layer for RAG responses
4. Add A/B testing framework for model improvements

---

## 8. SIGN-OFF

| Phase | Status | Reviewer | Date |
|-------|--------|----------|------|
| Service Health | 🟡 In Progress | - | - |
| Integration Validation | 🟡 Pending | - | - |
| LVM Testing | ⬜ Not Started | - | - |
| SLA Implementation | ⬜ Not Started | - | - |

---

**Document Version:** 1.0  
**Last Updated:** Phase 1 Analysis Complete
