# SmartClaim AI - Critical Failure Points Analysis

## Phase 1: System Vulnerability Assessment

**Date:** January 2025  
**Architect:** Principal AI Systems Architect  
**Classification:** Internal - Production Reliability

---

## EXECUTIVE SUMMARY

This document identifies **critical failure points** in the SmartClaim AI multimodal pipeline that could cause service degradation, data loss, or security vulnerabilities. Each failure point includes impact assessment, detection methods, and remediation strategies.

---

## 1. CRITICAL FAILURE POINTS TABLE

### 1.1 Security Vulnerabilities

| ID | Component | Failure Point | Severity | Probability | Impact | Detection |
|----|-----------|--------------|----------|-------------|--------|-----------|
| **SF-001** | Classifier | Hardcoded GEMINI_API_KEY | 🔴 CRITICAL | 100% | API key exposure, unauthorized usage, billing abuse | Code review |
| **SF-002** | Chat | Hardcoded GEMINI_API_KEY | 🔴 CRITICAL | 100% | Same as SF-001 | Code review |
| **SF-003** | All Services | CORS allow_origins=["*"] | 🟠 HIGH | 100% | Cross-site request exploitation | Security scan |
| **SF-004** | Frontend Routes | No rate limiting | 🟠 HIGH | 80% | DoS attacks, API abuse | Load testing |

### 1.2 Integration Failures

| ID | Component | Failure Point | Severity | Probability | Impact | Detection |
|----|-----------|--------------|----------|-------------|--------|-----------|
| **IF-001** | Frontend→Extractor | No timeout configured | 🔴 CRITICAL | 60% | Request hangs indefinitely, resource exhaustion | Stress test |
| **IF-002** | Frontend→Classifier | No timeout configured | 🔴 CRITICAL | 60% | Same as IF-001 | Stress test |
| **IF-003** | Chat→RAG | 30s timeout, no retry | 🟠 HIGH | 40% | Failed chat responses during RAG latency | Load test |
| **IF-004** | LVM→OpenRouter | External API dependency | 🟠 HIGH | 30% | LVM analysis fails | API monitoring |
| **IF-005** | RAG→Qdrant | No connection pooling | 🟡 MEDIUM | 25% | Connection exhaustion under load | Load test |

### 1.3 Data Flow Failures

| ID | Component | Failure Point | Severity | Probability | Impact | Detection |
|----|-----------|--------------|----------|-------------|--------|-----------|
| **DF-001** | Classifier | JSON parsing failure | 🔴 CRITICAL | 20% | Malformed LLM response crashes classification | Error logs |
| **DF-002** | LVM | JSON validation failure | 🟠 HIGH | 15% | Invalid visual evidence propagates | Validation tests |
| **DF-003** | Transcriber | Audio format rejection | 🟡 MEDIUM | 30% | Voice input fails silently | User reports |
| **DF-004** | Extractor | Large file timeout | 🟡 MEDIUM | 25% | File extraction incomplete | Monitoring |
| **DF-005** | RAG→Chat | Empty context | 🟡 MEDIUM | 20% | Chat provides generic responses | Quality checks |

### 1.4 Resource Exhaustion

| ID | Component | Failure Point | Severity | Probability | Impact | Detection |
|----|-----------|--------------|----------|-------------|--------|-----------|
| **RE-001** | Qdrant | Vector storage full | 🔴 CRITICAL | 10% | RAG system fails entirely | Disk monitoring |
| **RE-002** | Docker | Container memory limits | 🟠 HIGH | 35% | OOM kills, service restart | Container metrics |
| **RE-003** | Transcriber | Model loading memory | 🟠 HIGH | 20% | Service fails to start | Health checks |
| **RE-004** | Extractor | PDF memory explosion | 🟡 MEDIUM | 15% | Large PDF crashes service | Memory monitoring |

---

## 2. FAILURE CASCADE ANALYSIS

### 2.1 Single Point of Failure (SPOF) Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SINGLE POINTS OF FAILURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         SPOF LEVEL 1: TOTAL OUTAGE                    │  │
│  │  • PostgreSQL (Supabase) - All data operations fail                   │  │
│  │  • Qdrant - All RAG/Chat contextual responses fail                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     SPOF LEVEL 2: FEATURE OUTAGE                      │  │
│  │  • Gemini API Key Invalid → Classifier + Chat + RAG broken            │  │
│  │  • OpenRouter API Key Invalid → LVM image analysis broken             │  │
│  │  • Extractor Down → File uploads broken                               │  │
│  │  • Transcriber Down → Voice input broken                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     SPOF LEVEL 3: DEGRADED SERVICE                    │  │
│  │  • RAG Service Down → Chat works but without context                  │  │
│  │  • LVM Down → Image analysis skipped, text-only classification        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Failure Cascade Scenarios

#### Scenario A: Gemini API Rate Limit
```
Gemini API 429 Error
    │
    ├──▶ Classifier fails (500)
    │       └──▶ New ticket creation broken
    │
    ├──▶ Chat fails (500)
    │       └──▶ All chat responses fail
    │
    └──▶ RAG embedding fails
            └──▶ New tickets not indexed
                    └──▶ Future searches miss new data
```

#### Scenario B: Qdrant Connection Lost
```
Qdrant Unavailable
    │
    ├──▶ RAG health degraded
    │       └──▶ Chat context retrieval fails
    │               └──▶ Generic responses only
    │
    └──▶ Ticket ingestion paused
            └──▶ Vector store out of sync
                    └──▶ Search results incomplete
```

#### Scenario C: Container Memory Pressure
```
Host Memory Pressure
    │
    ├──▶ Transcriber OOM (Vosk models ~300MB)
    │       └──▶ Voice input unavailable
    │
    ├──▶ Extractor OOM (PaddleOCR ~400MB)
    │       └──▶ File OCR fails
    │
    └──▶ LVM OOM (unlikely - stateless)
            └──▶ Image analysis unavailable
```

---

## 3. DETECTION & MONITORING REQUIREMENTS

### 3.1 Health Check Matrix

| Service | Current Status | Required Health Checks |
|---------|---------------|----------------------|
| Extractor | ⚠️ No endpoint | `GET /health` → OCR engine status, memory usage |
| Classifier | ❌ Missing | `GET /health` → Gemini API connectivity test |
| Chat | ❌ Missing | `GET /health` → Gemini + RAG connectivity |
| Transcriber | ❌ Missing | `GET /health` → Vosk model loaded, Whisper available |
| RAG | ✅ Exists | Already returns vector store status |
| LVM | ✅ Exists | Already returns model and API status |

### 3.2 Recommended Metrics

```python
# Per-Service Metrics to Collect
metrics = {
    "request_count": Counter("Total requests processed"),
    "request_latency_seconds": Histogram("Request latency"),
    "error_count": Counter("Errors by type"),
    "active_connections": Gauge("Current active connections"),
    "memory_usage_bytes": Gauge("Process memory usage"),
    "api_calls_external": Counter("External API calls (Gemini/OpenRouter)"),
    "api_errors_external": Counter("External API errors"),
}
```

### 3.3 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Service response time | >2s | >5s | Scale or investigate |
| Error rate | >5% | >15% | Page on-call |
| Memory usage | >70% | >90% | Restart/scale |
| External API errors | >3/min | >10/min | Check API status |
| Queue depth (if any) | >100 | >500 | Scale workers |

---

## 4. REMEDIATION STRATEGIES

### 4.1 Immediate Fixes (Priority 1)

```python
# FIX SF-001 & SF-002: Remove hardcoded API keys
# In classifier/app.py and chat/app.py

# BEFORE (INSECURE):
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBkuu6HZHTrMqtni0rsqepjhyyppu5Oh1U")

# AFTER (SECURE):
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable required")
```

```typescript
// FIX IF-001 & IF-002: Add timeouts to frontend API routes
// In apps/web/app/api/smartclaim/classify/route.ts

// BEFORE:
const response = await fetch('http://localhost:8001/classify', {...});

// AFTER:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
try {
  const response = await fetch('http://localhost:8001/classify', {
    ...options,
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}
```

### 4.2 Short-Term Fixes (Priority 2)

```python
# Add health endpoints to all services
# Template for classifier/app.py

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Gemini connectivity (lightweight check)
        test_response = client.models.get(name="gemini-2.5-flash")
        gemini_status = "healthy"
    except Exception as e:
        gemini_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if gemini_status == "healthy" else "degraded",
        "service": "classifier",
        "version": "1.0.0",
        "dependencies": {
            "gemini_api": gemini_status
        }
    }
```

### 4.3 Long-Term Improvements (Priority 3)

1. **Circuit Breaker Pattern**
```python
from tenacity import retry, stop_after_attempt, wait_exponential, CircuitBreaker

circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    expected_exception=Exception
)

@circuit_breaker
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_external_api():
    ...
```

2. **Request Tracing**
```python
import uuid

@app.middleware("http")
async def add_trace_id(request, call_next):
    trace_id = request.headers.get("X-Trace-ID", str(uuid.uuid4()))
    request.state.trace_id = trace_id
    response = await call_next(request)
    response.headers["X-Trace-ID"] = trace_id
    return response
```

---

## 5. RECOVERY PROCEDURES

### 5.1 Service Recovery Matrix

| Failure Scenario | Detection Time | Recovery Steps | RTO |
|-----------------|----------------|----------------|-----|
| Single service crash | <1 min (Docker) | Auto-restart via `restart: unless-stopped` | 30s |
| Gemini API down | <5 min (health check) | 1. Switch to fallback model, 2. Queue requests | 5 min |
| Qdrant data loss | <1 min (health check) | 1. Restore from backup, 2. Re-index tickets | 30 min |
| Database corruption | <5 min (query errors) | 1. Failover to replica, 2. Point-in-time recovery | 15 min |

### 5.2 Runbook: Emergency Response

```bash
# 1. Check all service health
for port in 8000 8001 8002 8003 8004 8005; do
  echo "Checking :$port"
  curl -s http://localhost:$port/health || echo "FAILED"
done

# 2. Check Docker container status
docker ps -a --filter "name=python-services"

# 3. View recent logs for failed service
docker logs --tail 100 python-services-<service>-1

# 4. Restart specific service
docker compose -f python-services/docker-compose.yml restart <service>

# 5. Full stack restart (last resort)
docker compose -f python-services/docker-compose.yml down
docker compose -f python-services/docker-compose.yml up -d
```

---

## 6. RISK MATRIX SUMMARY

```
                    PROBABILITY
                    Low    Medium    High
              ┌─────────┬──────────┬──────────┐
        High  │ RE-001  │ IF-003   │ SF-003   │
              │ DF-001  │ IF-004   │ SF-004   │
    IMPACT    ├─────────┼──────────┼──────────┤
       Medium │ DF-005  │ RE-002   │ IF-001   │
              │         │ DF-002   │ IF-002   │
              ├─────────┼──────────┼──────────┤
         Low  │         │ DF-003   │          │
              │         │ DF-004   │          │
              └─────────┴──────────┴──────────┘

Legend:
- Top-Right = CRITICAL (Act Now)
- Middle = HIGH (Plan Fix)
- Bottom-Left = MONITOR
```

---

## 7. SIGN-OFF

| Review | Status | Date |
|--------|--------|------|
| Security Review | 🟡 Pending | - |
| Architecture Review | ✅ Complete | - |
| Operations Review | 🟡 Pending | - |

---

**Document Version:** 1.0  
**Classification:** Internal  
**Next Review:** After Phase 2 LVM Testing
