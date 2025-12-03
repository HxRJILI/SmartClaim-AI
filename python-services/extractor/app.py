# python-services/extractor/app.py
"""
SmartClaim File Text Extraction Service
Supports: CSV, Excel, PDF, DOCX, PPT, MD, TXT
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import PyPDF2
from docx import Document
from pptx import Presentation
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartClaim File Extractor",
    description="Extract text from various file formats",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Next.js URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_from_csv(file_content: bytes) -> str:
    """Extract text from CSV file"""
    try:
        df = pd.read_csv(io.BytesIO(file_content))
        return df.to_string()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")

def extract_from_excel(file_content: bytes) -> str:
    """Extract text from Excel file"""
    try:
        df = pd.read_excel(io.BytesIO(file_content))
        return df.to_string()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel parsing error: {str(e)}")

def extract_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using OCR if needed"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page_num, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text:
                text += f"\n--- Page {page_num + 1} ---\n{page_text}"
        
        # If no text extracted, might need OCR
        if not text.strip():
            # TODO: Implement OCR using pytesseract or similar
            logger.warning("PDF appears to be scanned. OCR not implemented yet.")
            return "PDF appears to be scanned and requires OCR processing."
        
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF parsing error: {str(e)}")

def extract_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(io.BytesIO(file_content))
        paragraphs = [paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()]
        
        # Also extract text from tables
        tables_text = []
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells]
                tables_text.append(" | ".join(row_text))
        
        full_text = "\n".join(paragraphs)
        if tables_text:
            full_text += "\n\n--- Tables ---\n" + "\n".join(tables_text)
        
        return full_text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DOCX parsing error: {str(e)}")

def extract_from_pptx(file_content: bytes) -> str:
    """Extract text from PowerPoint file"""
    try:
        prs = Presentation(io.BytesIO(file_content))
        text = ""
        for slide_num, slide in enumerate(prs.slides, 1):
            slide_text = f"\n--- Slide {slide_num} ---\n"
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text.strip():
                    slide_text += shape.text + "\n"
            text += slide_text
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PPTX parsing error: {str(e)}")

def extract_from_text(file_content: bytes) -> str:
    """Extract text from plain text or markdown files"""
    try:
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return file_content.decode('latin-1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Text decoding error: {str(e)}")

@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text from uploaded file
    
    Supported formats: CSV, Excel, PDF, DOCX, PPTX, TXT, MD
    """
    file_content = await file.read()
    file_name = file.filename.lower() if file.filename else ""
    
    logger.info(f"Processing file: {file.filename} ({len(file_content)} bytes)")
    
    text = ""
    metadata = {
        "file_name": file.filename,
        "file_type": file.content_type,
        "size_bytes": len(file_content)
    }
    
    try:
        # Determine file type and extract accordingly
        if file_name.endswith('.csv'):
            text = extract_from_csv(file_content)
            metadata["format"] = "csv"
            
        elif file_name.endswith(('.xls', '.xlsx')):
            text = extract_from_excel(file_content)
            metadata["format"] = "excel"
            
        elif file_name.endswith('.pdf'):
            text = extract_from_pdf(file_content)
            metadata["format"] = "pdf"
            
        elif file_name.endswith('.docx'):
            text = extract_from_docx(file_content)
            metadata["format"] = "docx"
            
        elif file_name.endswith(('.ppt', '.pptx')):
            text = extract_from_pptx(file_content)
            metadata["format"] = "pptx"
            
        elif file_name.endswith(('.txt', '.md')):
            text = extract_from_text(file_content)
            metadata["format"] = "text"
            
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Supported: CSV, Excel, PDF, DOCX, PPTX, TXT, MD"
            )
        
        metadata["extracted_length"] = len(text)
        metadata["word_count"] = len(text.split())
        
        logger.info(f"Successfully extracted {metadata['word_count']} words from {file.filename}")
        
        return {
            "success": True,
            "text": text,
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction error for {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "file-extractor",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)