#!/usr/bin/env python3
"""
LVM Test Script
Tests the LVM analyzer with sample images
"""

import os
import sys
import json
import requests

# Test configuration
LVM_URL = os.environ.get("LVM_URL", "http://localhost:8005")

# Sample test images (public domain industrial images)
TEST_IMAGES = [
    {
        "name": "Industrial Scene Test",
        "url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
        "metadata": {
            "source": "test_script",
            "location": "Test Factory",
            "department": "Quality Control"
        }
    },
    {
        "name": "Warehouse Test",
        "url": "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800",
        "metadata": {
            "source": "test_script",
            "location": "Test Warehouse",
            "department": "Logistics"
        }
    }
]


def test_health():
    """Test health endpoint."""
    print("\n" + "=" * 60)
    print("Testing Health Endpoint")
    print("=" * 60)
    
    try:
        response = requests.get(f"{LVM_URL}/health", timeout=10)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Health check passed: {data}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False


def test_metrics():
    """Test metrics endpoint."""
    print("\n" + "=" * 60)
    print("Testing Metrics Endpoint")
    print("=" * 60)
    
    try:
        response = requests.get(f"{LVM_URL}/metrics", timeout=10)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Metrics retrieved: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Metrics failed: {e}")
        return False


def test_analyze(image_config: dict):
    """Test analyze endpoint with an image."""
    print("\n" + "=" * 60)
    print(f"Testing: {image_config['name']}")
    print("=" * 60)
    
    payload = {
        "image_url": image_config["url"],
        "metadata": image_config.get("metadata")
    }
    
    print(f"Image URL: {image_config['url'][:80]}...")
    
    try:
        response = requests.post(
            f"{LVM_URL}/analyze",
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"\n✅ Analysis successful!")
        print(f"\n📋 Results:")
        print(f"  Visual Summary: {data['visual_summary'][:200]}...")
        print(f"  Scene Type: {data['scene_type']}")
        print(f"  Detected Objects: {', '.join(data['detected_objects'][:5])}")
        print(f"  Issue Detected: {data['potential_issue_detected']}")
        print(f"  Severity Hint: {data['visual_severity_hint']}")
        print(f"  Image Quality: {data['image_quality']}")
        print(f"  Needs Human Review: {data['requires_human_review']}")
        print(f"  Processing Time: {data['processing_time_ms']:.0f}ms")
        
        if data['issue_hypotheses']:
            print(f"\n  Issue Hypotheses:")
            for hyp in data['issue_hypotheses']:
                print(f"    - {hyp['issue_type']}: {hyp['confidence']:.2%}")
        
        return True, data
        
    except requests.exceptions.Timeout:
        print(f"❌ Request timed out")
        return False, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Response: {e.response.text}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, None


def test_local_analyzer():
    """Test the analyzer module directly (without API)."""
    print("\n" + "=" * 60)
    print("Testing Local Analyzer Module")
    print("=" * 60)
    
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("⚠️ OPENROUTER_API_KEY not set, skipping local test")
        return None
    
    try:
        from lvm_analyzer import LVMAnalyzer
        
        analyzer = LVMAnalyzer(api_key=api_key)
        
        # Test with a simple image
        result = analyzer.analyze_image(
            image_url=TEST_IMAGES[0]["url"],
            metadata=TEST_IMAGES[0]["metadata"]
        )
        
        print(f"✅ Local analyzer test passed!")
        print(f"   Scene: {result['scene_type']}")
        print(f"   Summary: {result['visual_summary'][:100]}...")
        
        # Get metrics
        metrics = analyzer.get_metrics()
        print(f"\n📊 Analyzer Metrics:")
        print(f"   Total Calls: {metrics['total_calls']}")
        print(f"   Success Rate: {metrics['success_rate']:.1%}")
        
        return True
        
    except Exception as e:
        print(f"❌ Local analyzer test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "🔬 " + "=" * 56 + " 🔬")
    print("          LVM (Vision Language Model) Test Suite")
    print("🔬 " + "=" * 56 + " 🔬")
    
    results = {
        "health": False,
        "metrics": False,
        "analyses": []
    }
    
    # Test health endpoint
    results["health"] = test_health()
    
    # Test metrics endpoint
    results["metrics"] = test_metrics()
    
    # If health check passed, test analysis
    if results["health"]:
        for image_config in TEST_IMAGES:
            success, data = test_analyze(image_config)
            results["analyses"].append({
                "name": image_config["name"],
                "success": success,
                "data": data
            })
    else:
        print("\n⚠️ Skipping analysis tests due to health check failure")
    
    # Test local module if running from lvm directory
    if os.path.exists("lvm_analyzer.py"):
        results["local"] = test_local_analyzer()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"  Health Check: {'✅ PASS' if results['health'] else '❌ FAIL'}")
    print(f"  Metrics: {'✅ PASS' if results['metrics'] else '❌ FAIL'}")
    
    if results["analyses"]:
        analysis_pass = sum(1 for a in results["analyses"] if a["success"])
        print(f"  Analyses: {analysis_pass}/{len(results['analyses'])} passed")
    
    if "local" in results:
        print(f"  Local Module: {'✅ PASS' if results.get('local') else '❌ FAIL'}")
    
    # Return exit code
    all_passed = (
        results["health"] and 
        results["metrics"] and
        all(a["success"] for a in results["analyses"])
    )
    
    print("\n" + ("✅ All tests passed!" if all_passed else "❌ Some tests failed"))
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
