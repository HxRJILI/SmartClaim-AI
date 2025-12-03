# python-services/transcriber/app.py
"""
SmartClaim Voice Transcription Service
Uses Whisper API for ASR (Automatic Speech Recognition)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import openai
import os
import logging
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartClaim Transcriber",
    description="Transcribe voice recordings to text",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai.api_key = os.getenv("OPENAI_API_KEY")

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe audio file to text using Whisper API
    
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    """
    try:
        logger.info(f"Transcribing audio file: {file.filename}")
        
        # Read file content
        audio_content = await file.read()
        
        # Save to temporary file (Whisper API requires file path)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name
        
        # Transcribe using Whisper
        with open(temp_file_path, "rb") as audio_file:
            transcript = openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json"
            )
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        logger.info(f"Transcription successful: {len(transcript.text)} characters")
        
        return {
            "success": True,
            "text": transcript.text,
            "language": transcript.language,
            "duration": transcript.duration,
            "confidence": 0.95  # Whisper doesn't provide confidence, using high default
        }
        
    except openai.OpenAIError as e:
        logger.error(f"Whisper API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "transcriber",
        "version": "1.0.0",
        "whisper_available": bool(openai.api_key)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)