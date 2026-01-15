"""
SmartClaim LVM + LLM Testing Interface
A Streamlit app to test the multimodal classification pipeline
"""

import streamlit as st
import requests
from PIL import Image
import io
import base64
import json
from typing import Optional, Dict, Any

# Service URLs
LVM_URL = "http://localhost:8005/analyze"
LLM_URL = "http://localhost:8001/classify"

st.set_page_config(
    page_title="SmartClaim LVM+LLM Test",
    page_icon="🔍",
    layout="wide"
)

st.title("🔍 SmartClaim Multimodal Classification Test")
st.markdown("Test the **LVM (Vision)** + **LLM (Text)** pipeline for incident classification")

# Sidebar for configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    
    st.subheader("Services Status")
    
    # Check LVM health
    try:
        lvm_health = requests.get("http://localhost:8005/health", timeout=2)
        if lvm_health.status_code == 200:
            st.success("✅ LVM Service Online")
        else:
            st.error("❌ LVM Service Error")
    except:
        st.error("❌ LVM Service Offline")
    
    # Check LLM health
    try:
        llm_health = requests.get("http://localhost:8001/health", timeout=2)
        if llm_health.status_code == 200:
            st.success("✅ LLM Service Online")
        else:
            st.error("❌ LLM Service Error")
    except:
        st.error("❌ LLM Service Offline")
    
    st.divider()
    
    st.subheader("Pipeline Options")
    use_lvm = st.checkbox("Use LVM (Image Analysis)", value=True)
    use_llm = st.checkbox("Use LLM (Classification)", value=True)
    
    st.divider()
    
    st.info("""
    **About RAG Integration:**
    
    The current pipeline doesn't use RAG because:
    - LVM extracts visual evidence
    - LLM classifies based on evidence
    - This is classification, not retrieval
    
    **RAG would help if:**
    - Need company policy context
    - Want similar past incidents
    - Require regulatory references
    """)


def encode_image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 data URI"""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_bytes = buffered.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/jpeg;base64,{img_base64}"


def analyze_with_lvm(image_data_uri: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    """Call LVM service to analyze image"""
    try:
        payload = {
            "image_url": image_data_uri,
            "metadata": metadata or {}
        }
        
        response = requests.post(
            LVM_URL,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            if result is None:
                return {"error": "LVM returned empty response"}
            return result
        else:
            error_text = response.text if response.text else "Unknown error"
            return {"error": f"LVM returned status {response.status_code}: {error_text}"}
    except requests.exceptions.Timeout:
        return {"error": "LVM request timed out after 60 seconds"}
    except requests.exceptions.ConnectionError:
        return {"error": "Could not connect to LVM service. Is it running on port 8005?"}
    except Exception as e:
        return {"error": f"LVM request failed: {str(e) if str(e) else 'Unknown error'}"}


def classify_with_llm(text: str) -> Dict[str, Any]:
    """Call LLM classifier service"""
    try:
        payload = {"text": text}
        
        response = requests.post(
            LLM_URL,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result is None:
                return {"error": "LLM returned empty response"}
            return result
        else:
            error_text = response.text if response.text else "Unknown error"
            return {"error": f"LLM returned status {response.status_code}: {error_text}"}
    except requests.exceptions.Timeout:
        return {"error": "LLM request timed out after 30 seconds"}
    except requests.exceptions.ConnectionError:
        return {"error": "Could not connect to LLM service. Is it running on port 8001?"}
    except Exception as e:
        return {"error": f"LLM request failed: {str(e) if str(e) else 'Unknown error'}"}


def format_lvm_results(lvm_data: Dict[str, Any]) -> str:
    """Format LVM results into text for LLM"""
    # Check for actual error (not None)
    error = lvm_data.get("error")
    if error is not None and error != "":
        return f"[LVM Error: {error}]"
    
    parts = []
    
    # Visual summary
    parts.append(f"Visual Analysis: {lvm_data.get('visual_summary', 'N/A')}")
    
    # Confirmed observations
    confirmed = lvm_data.get('confirmed_observations', [])
    if confirmed:
        parts.append(f"Confirmed Observations: {', '.join(confirmed)}")
    
    # Ambiguous observations
    ambiguous = lvm_data.get('ambiguous_observations', [])
    if ambiguous:
        parts.append(f"Ambiguous Observations: {', '.join(ambiguous)}")
    
    # Issue hypotheses
    hypotheses = lvm_data.get('issue_hypotheses', [])
    if hypotheses:
        hyp_strs = []
        for h in hypotheses:
            hyp_strs.append(
                f"{h.get('issue_type', 'unknown')} "
                f"(confidence: {h.get('confidence', 0):.2f}, "
                f"evidence: {h.get('visual_evidence', 'N/A')})"
            )
        parts.append(f"Visual Issues: {'; '.join(hyp_strs)}")
    
    # Image quality and severity
    parts.append(f"Image Quality: {lvm_data.get('image_quality', 'unknown')}")
    parts.append(f"Visual Severity: {lvm_data.get('visual_severity_hint', 'none')}")
    
    return "\n".join(parts)


# Main interface
col1, col2 = st.columns(2)

with col1:
    st.header("📸 Input")
    
    # Image upload
    uploaded_file = st.file_uploader(
        "Upload Image",
        type=['jpg', 'jpeg', 'png'],
        help="Upload an image for LVM analysis"
    )
    
    if uploaded_file:
        image = Image.open(uploaded_file)
        st.image(image, caption="Uploaded Image", width='stretch')
    
    # Text description
    user_text = st.text_area(
        "Text Description (optional)",
        placeholder="Describe the incident in French or English...\nExample: 'Un ouvrier s'est brûlé la main avec de l'huile chaude'",
        height=100
    )
    
    # Metadata (optional)
    with st.expander("🏷️ Additional Metadata (optional)"):
        location = st.text_input("Location", placeholder="Factory Floor B")
        department = st.text_input("Department", placeholder="Maintenance")
        reported_issue = st.text_input("Reported Issue", placeholder="Equipment malfunction")

with col2:
    st.header("📊 Results")
    
    if st.button("🚀 Run Analysis", type="primary", width='stretch'):
        if not uploaded_file and not user_text:
            st.warning("⚠️ Please provide an image or text description")
        else:
            # Progress tracking
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            # Store results
            lvm_result = None
            llm_result = None
            combined_text = user_text or ""
            
            # Step 1: LVM Analysis
            if uploaded_file and use_lvm:
                status_text.text("🔍 Analyzing image with LVM...")
                progress_bar.progress(25)
                
                image = Image.open(uploaded_file)
                image_data_uri = encode_image_to_base64(image)
                
                metadata = {}
                if location:
                    metadata["location"] = location
                if department:
                    metadata["department"] = department
                if reported_issue:
                    metadata["reported_issue"] = reported_issue
                
                lvm_result = analyze_with_lvm(image_data_uri, metadata)
                
                # Check if there's an actual error (not None or empty)
                has_error = lvm_result.get("error") is not None and lvm_result.get("error") != ""
                
                if not has_error:
                    st.success("✅ LVM analysis complete")
                    
                    # Append LVM results to text
                    lvm_text = format_lvm_results(lvm_result)
                    if combined_text:
                        combined_text += "\n\n" + lvm_text
                    else:
                        combined_text = lvm_text
                else:
                    st.error(f"❌ LVM Error: {lvm_result['error']}")
                
                progress_bar.progress(50)
            
            # Step 2: LLM Classification
            if combined_text and use_llm:
                status_text.text("🤖 Classifying with LLM...")
                progress_bar.progress(75)
                
                llm_result = classify_with_llm(combined_text)
                
                # Check for actual error (not None)
                llm_error = llm_result.get("error")
                if llm_error is None or llm_error == "":
                    st.success("✅ LLM classification complete")
                else:
                    st.error(f"❌ LLM Error: {llm_error}")
                
                progress_bar.progress(100)
            
            status_text.text("✨ Analysis complete!")
            progress_bar.empty()
            
            # Display Results
            st.divider()
            
            # LVM Results
            if lvm_result and use_lvm:
                st.subheader("👁️ LVM Results (Vision)")
                
                # Check for actual error (not None)
                lvm_error = lvm_result.get("error")
                if lvm_error is not None and lvm_error != "":
                    st.error(lvm_error)
                else:
                    # Key metrics
                    col_a, col_b, col_c = st.columns(3)
                    col_a.metric(
                        "Scene Type",
                        lvm_result.get('scene_type', 'unknown').replace('_', ' ').title()
                    )
                    col_b.metric(
                        "Visual Severity",
                        lvm_result.get('visual_severity_hint', 'none').upper()
                    )
                    col_c.metric(
                        "Image Quality",
                        lvm_result.get('image_quality', 'unknown').upper()
                    )
                    
                    # Visual summary
                    st.write("**Visual Summary:**")
                    st.info(lvm_result.get('visual_summary', 'N/A'))
                    
                    # Observations
                    col_obs1, col_obs2 = st.columns(2)
                    
                    with col_obs1:
                        st.write("**✅ Confirmed Observations:**")
                        confirmed = lvm_result.get('confirmed_observations', [])
                        if confirmed:
                            for obs in confirmed:
                                st.write(f"- {obs}")
                        else:
                            st.write("- None")
                    
                    with col_obs2:
                        st.write("**⚠️ Ambiguous Observations:**")
                        ambiguous = lvm_result.get('ambiguous_observations', [])
                        if ambiguous:
                            for obs in ambiguous:
                                st.write(f"- {obs}")
                        else:
                            st.write("- None")
                    
                    # Issue hypotheses
                    st.write("**🔬 Issue Hypotheses:**")
                    hypotheses = lvm_result.get('issue_hypotheses', [])
                    if hypotheses:
                        for h in hypotheses:
                            conf = h.get('confidence', 0)
                            color = "🟢" if conf > 0.8 else "🟡" if conf > 0.6 else "🔴"
                            st.write(
                                f"{color} **{h.get('issue_type', 'unknown')}** "
                                f"(confidence: {conf:.2%})"
                            )
                            st.write(f"   Evidence: {h.get('visual_evidence', 'N/A')}")
                    
                    # Human review flag
                    if lvm_result.get('requires_human_review', False):
                        st.warning("⚠️ **Human Review Required**")
                        reasons = lvm_result.get('review_reasons', [])
                        if reasons:
                            for reason in reasons:
                                st.write(f"- {reason}")
                    
                    # Processing time
                    st.caption(f"Processing time: {lvm_result.get('processing_time_ms', 0):.0f}ms")
                    
                    # Raw JSON
                    with st.expander("📄 Raw LVM JSON"):
                        st.json(lvm_result)
            
            st.divider()
            
            # LLM Results
            if llm_result and use_llm:
                st.subheader("🤖 LLM Results (Classification)")
                
                # Check for actual error (not None)
                llm_display_error = llm_result.get("error")
                if llm_display_error is not None and llm_display_error != "":
                    st.error(llm_display_error)
                else:
                    # Key classification
                    col_x, col_y, col_z = st.columns(3)
                    
                    # Category with color
                    category = llm_result.get('category', 'other')
                    category_colors = {
                        'safety': '🔴',
                        'quality': '🟠',
                        'maintenance': '🔵',
                        'logistics': '🟢',
                        'hr': '🟣',
                        'other': '⚪'
                    }
                    col_x.metric(
                        "Category",
                        f"{category_colors.get(category, '⚪')} {category.upper()}"
                    )
                    
                    # Priority with emoji
                    priority = llm_result.get('priority', 'low')
                    priority_emojis = {
                        'critical': '🔥',
                        'high': '🚨',
                        'medium': '⚡',
                        'low': '📌'
                    }
                    col_y.metric(
                        "Priority",
                        f"{priority_emojis.get(priority, '📌')} {priority.upper()}"
                    )
                    
                    # Confidence
                    confidence = llm_result.get('confidence', 0)
                    col_z.metric(
                        "Confidence",
                        f"{confidence:.1%}"
                    )
                    
                    # Summary
                    st.write("**Summary:**")
                    st.info(llm_result.get('summary', 'N/A'))
                    
                    # Department
                    dept = llm_result.get('suggested_department')
                    if dept:
                        st.write(f"**Suggested Department:** {dept}")
                    
                    # Keywords
                    keywords = llm_result.get('keywords', [])
                    if keywords:
                        st.write("**Keywords:**")
                        st.write(" • ".join(f"`{kw}`" for kw in keywords))
                    
                    # Reasoning
                    st.write("**Reasoning:**")
                    st.write(llm_result.get('reasoning', 'N/A'))
                    
                    # New fields from improved prompt
                    col_inc, col_rev = st.columns(2)
                    
                    with col_inc:
                        is_confirmed = llm_result.get('is_confirmed_incident', False)
                        if is_confirmed:
                            st.error("🚨 **Confirmed Incident**")
                        else:
                            st.warning("⚠️ **Potential Risk (Not Confirmed)**")
                    
                    with col_rev:
                        needs_review = llm_result.get('requires_human_review', False)
                        if needs_review:
                            st.warning("👤 **Human Review Required**")
                        else:
                            st.success("✅ **No Review Needed**")
                    
                    # Safety escalation rationale
                    safety_rationale = llm_result.get('safety_escalation_rationale')
                    if safety_rationale:
                        st.write("**Safety Escalation Rationale:**")
                        st.error(safety_rationale)
                    
                    # Raw JSON
                    with st.expander("📄 Raw LLM JSON"):
                        st.json(llm_result)
            
            st.divider()
            
            # Combined input sent to LLM
            if combined_text:
                with st.expander("📝 Combined Input Sent to LLM"):
                    st.text(combined_text)


# Footer
st.divider()
st.markdown("""
<div style='text-align: center; color: gray; font-size: 0.8em;'>
    <p>SmartClaim Multimodal Testing Interface | January 2026</p>
    <p>LVM: Qwen 2.5 VL 7B | LLM: Gemini 2.5 Flash</p>
</div>
""", unsafe_allow_html=True)
