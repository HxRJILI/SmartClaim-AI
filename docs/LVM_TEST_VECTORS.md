# SmartClaim LVM Test Vectors

## Test Suite Version 1.0.0

Comprehensive test vectors for validating the LVM (Vision Language Model) service functionality, edge cases, and integration points.

---

## 1. TEST CATEGORIES

| Category | Purpose | Count |
|----------|---------|-------|
| **FUNC** | Functional correctness | 8 |
| **EDGE** | Edge cases and boundaries | 6 |
| **PERF** | Performance and latency | 4 |
| **INT** | Integration with downstream | 4 |
| **SEC** | Security and validation | 4 |

---

## 2. FUNCTIONAL TEST VECTORS (FUNC)

### FUNC-001: Safety Hazard Detection (Clear Image)

**Description:** Test detection of clear safety hazard in industrial setting

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/safety/spill_floor.jpg",
  "metadata": {
    "source": "test_suite",
    "location": "Factory Floor A",
    "department": "Safety"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == True
assert response["scene_type"] == "industrial"
assert any(h["issue_type"] == "safety" for h in response["issue_hypotheses"])
assert response["visual_severity_hint"] in ["high", "critical"]
assert response["requires_human_review"] == True  # Safety issues always reviewed
assert "spill" in response["visual_summary"].lower() or "liquid" in response["visual_summary"].lower()
```

---

### FUNC-002: Equipment Maintenance Issue

**Description:** Test detection of maintenance-related issue (worn equipment)

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/maintenance/worn_conveyor.jpg",
  "metadata": {
    "source": "test_suite",
    "location": "Production Line B",
    "department": "Maintenance"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == True
assert any(h["issue_type"] == "maintenance" for h in response["issue_hypotheses"])
assert response["image_quality"] == "clear"
# Maintenance hypothesis should have highest confidence
maintenance_hypothesis = next(h for h in response["issue_hypotheses"] if h["issue_type"] == "maintenance")
assert maintenance_hypothesis["confidence"] >= 0.6
```

---

### FUNC-003: Quality Defect Detection

**Description:** Test detection of product quality issue

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/quality/defective_product.jpg",
  "metadata": {
    "source": "test_suite",
    "department": "Quality Control"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == True
assert any(h["issue_type"] == "quality" for h in response["issue_hypotheses"])
assert "defect" in response["visual_summary"].lower() or "damage" in response["visual_summary"].lower()
```

---

### FUNC-004: No Issue Detected (Normal Scene)

**Description:** Test with image showing no visible issues

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/normal/clean_warehouse.jpg",
  "metadata": {
    "source": "test_suite",
    "location": "Warehouse C"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == False
assert response["visual_severity_hint"] == "low"
assert response["requires_human_review"] == False
assert len(response["issue_hypotheses"]) == 0 or all(h["confidence"] < 0.3 for h in response["issue_hypotheses"])
```

---

### FUNC-005: Office Environment (Non-Industrial)

**Description:** Test scene type detection for office environment

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/office/it_equipment_issue.jpg",
  "metadata": {
    "source": "test_suite",
    "department": "IT"
  }
}
```

**Expected Output Assertions:**
```python
assert response["scene_type"] == "office"
assert any(h["issue_type"] == "IT" for h in response["issue_hypotheses"])
```

---

### FUNC-006: Logistics Issue (Warehouse)

**Description:** Test logistics/inventory issue detection

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/logistics/damaged_pallet.jpg",
  "metadata": {
    "source": "test_suite",
    "location": "Loading Dock 2"
  }
}
```

**Expected Output Assertions:**
```python
assert response["scene_type"] in ["warehouse", "transport"]
assert any(h["issue_type"] == "logistics" for h in response["issue_hypotheses"])
assert "pallet" in response["detected_objects"] or "cargo" in response["detected_objects"]
```

---

### FUNC-007: Multiple Issues Detected

**Description:** Test when image contains multiple potential issues

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/multi/safety_and_maintenance.jpg",
  "metadata": {
    "source": "test_suite",
    "reported_issue": "Multiple problems observed in work area"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == True
assert len(response["issue_hypotheses"]) >= 2
# Should flag for human review due to multiple issues
assert response["requires_human_review"] == True
```

---

### FUNC-008: Base64 Image Input

**Description:** Test with base64 encoded image instead of URL

**Input:**
```json
{
  "image_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...[truncated]",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["processing_time_ms"] > 0
assert response["model_version"] == "qwen/qwen-2.5-vl-7b-instruct:free"
assert response["error"] is None
```

---

## 3. EDGE CASE TEST VECTORS (EDGE)

### EDGE-001: Poor Image Quality (Blurry)

**Description:** Test handling of blurry/unfocused image

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/blurry_image.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["image_quality"] == "blurry"
assert response["requires_human_review"] == True
# Confidence should be lower due to poor quality
assert response["raw_confidence"] is None or response["raw_confidence"] < 0.6
```

---

### EDGE-002: Poor Image Quality (Dark)

**Description:** Test handling of underexposed/dark image

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/dark_image.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["image_quality"] == "dark"
assert response["requires_human_review"] == True
```

---

### EDGE-003: Partially Obstructed View

**Description:** Test handling of image with obstructed view

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/obstructed_view.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["image_quality"] == "obstructed"
assert response["requires_human_review"] == True
```

---

### EDGE-004: Empty/Ambiguous Scene

**Description:** Test handling of scene with no clear subject

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/empty_room.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["potential_issue_detected"] == False
assert len(response["detected_objects"]) < 3  # Few objects detected
assert response["scene_type"] in ["office", "warehouse", "unknown"]
```

---

### EDGE-005: Very Large Image (Near Limit)

**Description:** Test handling of large image file (19MB)

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/large_19mb.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["error"] is None
assert response["processing_time_ms"] < 60000  # Within timeout
```

---

### EDGE-006: Non-Standard Aspect Ratio

**Description:** Test handling of unusual aspect ratio (panoramic)

**Input:**
```json
{
  "image_url": "https://test-images.smartclaim.ai/edge/panoramic.jpg",
  "metadata": {
    "source": "test_suite"
  }
}
```

**Expected Output Assertions:**
```python
assert response["error"] is None
assert len(response["detected_objects"]) > 0
```

---

## 4. PERFORMANCE TEST VECTORS (PERF)

### PERF-001: Latency Under Normal Load

**Description:** Measure response time for standard request

**Test Procedure:**
```python
import time
start = time.time()
response = await client.post("/analyze", json=standard_request)
latency = (time.time() - start) * 1000

assert latency < 10000  # < 10 seconds
assert response["processing_time_ms"] < 8000  # Model processing < 8 seconds
```

---

### PERF-002: Concurrent Request Handling

**Description:** Test handling of multiple concurrent requests

**Test Procedure:**
```python
import asyncio

async def make_request():
    return await client.post("/analyze", json=standard_request)

# Send 5 concurrent requests
responses = await asyncio.gather(*[make_request() for _ in range(5)])

assert all(r.status_code == 200 for r in responses)
```

---

### PERF-003: Memory Under Load

**Description:** Monitor memory usage during sequential processing

**Test Procedure:**
```python
import psutil

initial_memory = psutil.Process().memory_info().rss

for _ in range(20):
    await client.post("/analyze", json=standard_request)

final_memory = psutil.Process().memory_info().rss
memory_increase = final_memory - initial_memory

# Memory should not grow unbounded (allow 100MB growth)
assert memory_increase < 100 * 1024 * 1024
```

---

### PERF-004: Base64 vs URL Performance

**Description:** Compare processing time for base64 vs URL inputs

**Test Procedure:**
```python
# URL request
url_start = time.time()
url_response = await client.post("/analyze", json={"image_url": "https://..."})
url_time = time.time() - url_start

# Base64 request (same image)
base64_start = time.time()
base64_response = await client.post("/analyze", json={"image_url": "data:image/jpeg;base64,..."})
base64_time = time.time() - base64_start

# Base64 should not be significantly slower (2x max)
assert base64_time < url_time * 2
```

---

## 5. INTEGRATION TEST VECTORS (INT)

### INT-001: Output Schema Compliance

**Description:** Verify output matches integration contract schema

**Test Procedure:**
```python
from jsonschema import validate
import json

response = await client.post("/analyze", json=standard_request)
data = response.json()

# Load contract schema
with open("docs/LVM_INTEGRATION_CONTRACT.md") as f:
    # Extract JSON schema from markdown
    schema = extract_schema_from_markdown(f.read())

# Validate against schema
validate(instance=data, schema=schema)  # Raises if invalid
```

---

### INT-002: Aggregation Layer Compatibility

**Description:** Verify output can be consumed by evidence aggregator

**Test Procedure:**
```python
lvm_response = await lvm_client.post("/analyze", json=request)
lvm_data = lvm_response.json()

# Simulate aggregation with text analysis
aggregated = {
    "visual_evidence": lvm_data,
    "text_evidence": {
        "category": "maintenance",
        "confidence": 0.75
    },
    "final_category": compute_final_category(lvm_data, text_evidence)
}

assert aggregated["final_category"] is not None
```

---

### INT-003: SLA Engine Input Compatibility

**Description:** Verify output contains required fields for SLA prediction

**Test Procedure:**
```python
response = await client.post("/analyze", json=standard_request)
data = response.json()

# SLA engine requires these fields
required_for_sla = [
    "visual_severity_hint",
    "issue_hypotheses",
    "requires_human_review"
]

for field in required_for_sla:
    assert field in data
    assert data[field] is not None
```

---

### INT-004: Frontend Hook Compatibility

**Description:** Verify TypeScript types match output

**Test Procedure:**
```typescript
// This should compile without errors
const result: LVMAnalysisResult = await analyzeImage(imageUrl);

// Type assertions
const summary: string = result.visual_summary;
const objects: string[] = result.detected_objects;
const severity: 'low' | 'medium' | 'high' | 'critical' = result.visual_severity_hint;
```

---

## 6. SECURITY TEST VECTORS (SEC)

### SEC-001: Invalid Image URL

**Description:** Test handling of malicious/invalid URLs

**Input:**
```json
{
  "image_url": "javascript:alert('xss')",
  "metadata": {}
}
```

**Expected:** HTTP 400 or sanitized error response

---

### SEC-002: SSRF Prevention

**Description:** Test that internal URLs are blocked

**Input:**
```json
{
  "image_url": "http://localhost:8080/admin",
  "metadata": {}
}
```

**Expected:** HTTP 400 with appropriate error

---

### SEC-003: Oversized Payload

**Description:** Test rejection of too-large requests

**Input:** 25MB base64 image in request body

**Expected:** HTTP 413 (Payload Too Large)

---

### SEC-004: Rate Limiting

**Description:** Test rate limiting enforcement

**Test Procedure:**
```python
# Send 100 requests rapidly
responses = [
    await client.post("/analyze", json=standard_request)
    for _ in range(100)
]

# Should see some 429 responses
rate_limited = [r for r in responses if r.status_code == 429]
assert len(rate_limited) > 0
```

---

## 7. TEST EXECUTION SCRIPT

```python
#!/usr/bin/env python3
"""
SmartClaim LVM Test Runner
Run: python test_lvm_vectors.py
"""

import asyncio
import httpx
import json
from dataclasses import dataclass
from typing import List, Dict, Any, Callable

LVM_URL = "http://localhost:8005"

@dataclass
class TestResult:
    name: str
    passed: bool
    error: str = None
    duration_ms: float = 0

async def run_test(name: str, test_fn: Callable) -> TestResult:
    """Run a single test and capture result"""
    import time
    start = time.time()
    try:
        await test_fn()
        return TestResult(
            name=name,
            passed=True,
            duration_ms=(time.time() - start) * 1000
        )
    except AssertionError as e:
        return TestResult(
            name=name,
            passed=False,
            error=str(e),
            duration_ms=(time.time() - start) * 1000
        )
    except Exception as e:
        return TestResult(
            name=name,
            passed=False,
            error=f"Unexpected error: {e}",
            duration_ms=(time.time() - start) * 1000
        )

async def test_health_check():
    """FUNC-000: Health check"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{LVM_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "lvm"

async def test_basic_analysis():
    """FUNC-001: Basic image analysis"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{LVM_URL}/analyze",
            json={
                "image_url": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800",
                "metadata": {"source": "test"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "visual_summary" in data
        assert "detected_objects" in data
        assert data["model_version"] == "qwen/qwen-2.5-vl-7b-instruct:free"

async def test_schema_compliance():
    """INT-001: Schema compliance"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{LVM_URL}/analyze",
            json={
                "image_url": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800",
                "metadata": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        required = [
            "visual_summary", "detected_objects", "scene_type",
            "potential_issue_detected", "issue_hypotheses",
            "visual_severity_hint", "image_quality", "requires_human_review",
            "processing_time_ms", "model_version"
        ]
        for field in required:
            assert field in data, f"Missing required field: {field}"

async def main():
    """Run all tests"""
    tests = [
        ("FUNC-000: Health Check", test_health_check),
        ("FUNC-001: Basic Analysis", test_basic_analysis),
        ("INT-001: Schema Compliance", test_schema_compliance),
    ]
    
    print("=" * 60)
    print("SmartClaim LVM Test Suite")
    print("=" * 60)
    
    results: List[TestResult] = []
    for name, test_fn in tests:
        print(f"\n▶ Running: {name}")
        result = await run_test(name, test_fn)
        results.append(result)
        
        if result.passed:
            print(f"  ✅ PASSED ({result.duration_ms:.0f}ms)")
        else:
            print(f"  ❌ FAILED: {result.error}")
    
    # Summary
    print("\n" + "=" * 60)
    passed = len([r for r in results if r.passed])
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed < total:
        print("\nFailed tests:")
        for r in results:
            if not r.passed:
                print(f"  - {r.name}: {r.error}")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
```

---

## 8. TEST DATA REQUIREMENTS

To run the full test suite, the following test images are needed:

| Image | Description | Size |
|-------|-------------|------|
| `safety/spill_floor.jpg` | Liquid spill on factory floor | ~500KB |
| `maintenance/worn_conveyor.jpg` | Worn conveyor belt equipment | ~600KB |
| `quality/defective_product.jpg` | Product with visible defect | ~400KB |
| `normal/clean_warehouse.jpg` | Clean, normal warehouse | ~500KB |
| `office/it_equipment_issue.jpg` | IT equipment with issue | ~400KB |
| `logistics/damaged_pallet.jpg` | Damaged pallet/cargo | ~500KB |
| `multi/safety_and_maintenance.jpg` | Multiple issues visible | ~600KB |
| `edge/blurry_image.jpg` | Intentionally blurry | ~300KB |
| `edge/dark_image.jpg` | Underexposed image | ~300KB |
| `edge/obstructed_view.jpg` | Partially blocked view | ~400KB |
| `edge/empty_room.jpg` | Empty room, no clear subject | ~300KB |
| `edge/large_19mb.jpg` | High-resolution image | ~19MB |
| `edge/panoramic.jpg` | Panoramic aspect ratio | ~800KB |

---

**Test Suite Version:** 1.0.0  
**Last Updated:** January 2025  
**Maintainer:** AI Systems Team
