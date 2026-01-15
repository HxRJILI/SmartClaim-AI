# SmartClaim LVM+LLM Testing Interface

A Streamlit app to test the multimodal classification pipeline (LVM + LLM) for SmartClaim.

## Quick Start

### 1. Install Dependencies

```bash
cd python-services
pip install -r requirements-streamlit.txt
```

### 2. Ensure Services are Running

Make sure Docker services are up:

```bash
docker compose up -d
```

Verify:
- LVM Service: http://localhost:8005/health
- LLM Classifier: http://localhost:8001/health

### 3. Run the Streamlit App

```bash
streamlit run test_lvm_llm_app.py
```

The app will open at: http://localhost:8501

## Features

### 1. Image Analysis (LVM)
- Upload industrial/workplace images
- Get visual evidence extraction
- See confirmed vs ambiguous observations
- View issue hypotheses with confidence scores
- Check image quality and severity hints

### 2. Text Classification (LLM)
- Provide text descriptions (French/English)
- Get category, priority, confidence
- See reasoning and keywords
- Check if incident is confirmed or potential risk
- Human review flags

### 3. Combined Pipeline
- Upload image + text description
- LVM analyzes image → generates visual evidence
- Evidence is appended to text
- LLM classifies based on combined input
- See how vision and language work together

### 4. Service Health Monitoring
- Real-time status checks for LVM and LLM
- Toggle services on/off for testing
- Error handling and debugging info

## Testing Scenarios

### Scenario 1: Image Only
1. Upload an image of equipment
2. Leave text empty
3. Run analysis
4. LVM extracts visual evidence
5. LLM classifies based on visual evidence alone

### Scenario 2: Text Only
1. No image upload
2. Enter text: "La machine CNC fait un bruit anormal"
3. Run analysis
4. LLM classifies based on text only

### Scenario 3: Multimodal (Image + Text)
1. Upload image of a spill
2. Add text: "Il y a une flaque d'eau près de l'escalier"
3. Run analysis
4. LVM extracts visual evidence
5. LLM considers both visual + textual evidence
6. See how they complement each other

### Scenario 4: Confirmed Incident vs Potential Risk
**Confirmed:**
- Text: "Un ouvrier s'est brûlé la main avec de l'huile chaude"
- Expected: `is_confirmed_incident: true`, `category: safety`, `priority: high`

**Potential Risk:**
- Text: "Il y a une flaque d'eau près de l'escalier"
- Expected: `is_confirmed_incident: false`, `requires_human_review: true`, `priority: medium`

## About RAG Integration

### Current Pipeline (No RAG)
```
Image → LVM → Visual Evidence
                    ↓
Text → LLM ← Combined Input → Classification
```

**Why no RAG?**
- LVM extracts objective visual evidence
- LLM classifies based on evidence
- This is a **classification task**, not retrieval
- Models have built-in knowledge of:
  - Industrial equipment types
  - Safety hazards
  - Workplace terminology

### When RAG Would Help

RAG integration would be beneficial for:

1. **Company-Specific Context**
   - "This machine type had 3 failures last month"
   - Company safety policies and procedures
   - Department-specific protocols

2. **Historical Incidents**
   - "Similar spill in 2025 took 2 hours to clean"
   - Past resolution strategies
   - Lessons learned database

3. **Regulatory References**
   - OSHA standards for specific hazards
   - Industry-specific regulations
   - Compliance requirements

4. **Expert Knowledge**
   - Maintenance manuals for equipment
   - Troubleshooting guides
   - Best practices documents

### RAG Enhancement Architecture (Optional)

If you want to add RAG later:

```python
# Pseudo-code for RAG-enhanced pipeline
def classify_with_rag(text: str, lvm_evidence: str):
    # 1. Extract key entities
    entities = extract_entities(text + lvm_evidence)
    # e.g., ["CNC machine", "oil leak", "safety hazard"]
    
    # 2. Query RAG for relevant context
    rag_context = rag_service.query({
        "entities": entities,
        "top_k": 5,
        "filters": {
            "department": metadata.get("department"),
            "category": predicted_category
        }
    })
    # Returns: past incidents, policies, manuals
    
    # 3. Enrich prompt with RAG context
    enriched_text = f"""
    {text}
    
    LVM Evidence:
    {lvm_evidence}
    
    Relevant Context:
    {rag_context}
    """
    
    # 4. Classify with enriched context
    return llm_classify(enriched_text)
```

### Decision: Do You Need RAG?

**Use Current Pipeline If:**
- ✅ You need fast, deterministic classification
- ✅ LLM's built-in knowledge is sufficient
- ✅ You don't have company-specific data yet
- ✅ You're in early testing/MVP phase

**Add RAG If:**
- ✅ You have historical incident database
- ✅ Need company policy enforcement
- ✅ Want to cite specific regulations
- ✅ Have equipment manuals to reference
- ✅ Need explainability with sources

**SmartClaim Already Has RAG** for the chat/tips feature (port 8004). You could:
1. Extend it to include incident classification context
2. Create a separate RAG index for policies/regulations
3. Add a "RAG toggle" in this Streamlit app for testing

## Troubleshooting

### Services Offline
```bash
# Check Docker containers
docker ps

# Restart services
cd python-services
docker compose restart classifier lvm
```

### Port Already in Use
```bash
# Kill process on port 8501
netstat -ano | findstr :8501
taskkill /PID <PID> /F

# Or change port
streamlit run test_lvm_llm_app.py --server.port 8502
```

### Image Too Large
- Resize images before upload
- Recommended: < 5MB, < 2000px width/height

## Architecture

```
┌─────────────────────┐
│  Streamlit App      │
│  (port 8501)        │
└─────────┬───────────┘
          │
          ├──────────────┐
          │              │
          ▼              ▼
    ┌─────────┐    ┌─────────┐
    │   LVM   │    │   LLM   │
    │  :8005  │    │  :8001  │
    └─────────┘    └─────────┘
         │              │
         └──────┬───────┘
                ▼
         Combined Results
```

## Next Steps

1. **Test Edge Cases**
   - Blurry images
   - Multiple languages
   - Ambiguous descriptions
   - Empty inputs

2. **Benchmark Performance**
   - Response times
   - Accuracy on test set
   - Human review rate

3. **RAG Integration** (if needed)
   - Connect to existing RAG service
   - Add policy/regulation index
   - Test with contextual queries

4. **Production Deployment**
   - Add authentication
   - Rate limiting
   - Logging and monitoring
   - A/B testing different prompts
