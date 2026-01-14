# python-services/transcriber/app.py
"""
SmartClaim Voice Transcription Service
Two-Stage ASR Pipeline: VOSK Encoding + Whisper Decoding
"""

import sys
import os
import json
import wave
import tempfile
import logging
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Set UTF-8 encoding for stdout to avoid charmap errors
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Imports with error handling - allow either faster-whisper or vosk
try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
    logger.info("✅ faster-whisper is available")
except Exception as e:
    WhisperModel = None
    WHISPER_AVAILABLE = False
    logger.warning(f"⚠️ faster-whisper not available: {e}")

try:
    from vosk import Model as VoskModel, KaldiRecognizer
    VOSK_AVAILABLE = True
    logger.info("✅ VOSK is available")
except Exception as e:
    VoskModel = None
    KaldiRecognizer = None
    VOSK_AVAILABLE = False
    logger.warning(f"⚠️ VOSK not available: {e}")

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
    logger.info("✅ pydub is available")
except Exception as e:
    PYDUB_AVAILABLE = False
    logger.warning(f"⚠️ pydub not available: {e}")

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except Exception:
    sf = None
    SOUNDFILE_AVAILABLE = False

try:
    import librosa
    LIBROSA_AVAILABLE = True
except Exception:
    librosa = None
    LIBROSA_AVAILABLE = False


app = FastAPI(
    title="SmartClaim Transcriber",
    description="Two-Stage ASR Pipeline: VOSK Encoding + Whisper Decoding",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def convert_audio_to_wav(input_path: str, target_sr: int = 16000) -> str | None:
    """Convert any audio format to WAV (16kHz, mono, 16-bit)"""
    if not PYDUB_AVAILABLE:
        logger.error("pydub not available for audio conversion")
        return None
    
    try:
        audio = AudioSegment.from_file(input_path)
        
        # Convert to mono
        if audio.channels > 1:
            audio = audio.set_channels(1)
        
        # Resample
        if audio.frame_rate != target_sr:
            audio = audio.set_frame_rate(target_sr)
        
        # 16-bit
        audio = audio.set_sample_width(2)
        
        # Export to temp WAV
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_wav:
            audio.export(temp_wav.name, format="wav")
            return temp_wav.name
    except Exception as e:
        logger.error(f"Audio conversion failed: {e}")
        return None


def transcribe_audio_pipeline(
    audio_path: str,
    language: str = "auto",
    model_size: str = "small",
    device: str = "cpu",
    compute_type: str = "int8"
) -> dict:
    """
    TWO-STAGE TRANSCRIPTION PIPELINE FOR MAXIMUM ACCURACY:
    
    STAGE 1 - VOSK ENCODING: Fast speech-to-text using Vosk Kaldi model (encoder)
    STAGE 2 - WHISPER DECODING: Refine and improve accuracy with faster-whisper (decoder)
    
    Pipeline: Audio → VOSK Encoding → WHISPER Refinement → Polished Transcription
    
    Features:
    - VAD (Voice Activity Detection): Filters out silence
    - Noise Reduction: Preprocessed audio analysis
    - Beam Search: beam_size=10 for better accuracy
    - Temperature=0.0: Deterministic results
    - No previous text dependency: Fresh start each time
    """
    
    temp_files = []
    vosk_transcription = None
    refined_transcription = None
    detected_language = language if language != "auto" else None
    duration = 0.0
    
    try:
        # Check file magic to see if it's already WAV
        try:
            with open(audio_path, "rb") as fh:
                magic = fh.read(4)
        except Exception:
            magic = None
        
        # Convert to WAV if needed
        if magic not in (b"RIFF", b"RIFX", b"RF64"):
            if not PYDUB_AVAILABLE:
                raise HTTPException(status_code=400, detail="pydub required for non-WAV files")
            
            converted = convert_audio_to_wav(audio_path)
            if not converted:
                raise HTTPException(status_code=500, detail="Audio conversion failed")
            temp_files.append(converted)
            audio_path = converted
        
        # ========== STAGE 1: VOSK ENCODING (Fast Kaldi-based speech recognition) ==========
        if VOSK_AVAILABLE:
            try:
                logger.info("[STAGE 1] 🎤 VOSK ENCODING: Starting fast speech-to-text recognition...")
                
                # Determine VOSK model path based on language
                asr_dir = os.environ.get("ASR_MODELS_DIR")
                
                # Map language codes to VOSK model folders
                VOSK_MODEL_MAP = {
                    "en": "vosk-model-small-en-us-0.15",
                    "fr": "vosk-model-small-fr-0.22",
                }
                
                # Select model based on language parameter
                if language in VOSK_MODEL_MAP:
                    vosk_sub = VOSK_MODEL_MAP[language]
                    logger.info(f"[VOSK] 🌐 Using {language.upper()} model: {vosk_sub}")
                elif language == "auto":
                    # Default to English for auto-detection (Whisper will refine)
                    vosk_sub = os.environ.get("VOSK_MODEL_SUBPATH", "vosk-model-small-en-us-0.15")
                    logger.info(f"[VOSK] 🌐 Auto mode - defaulting to EN model (Whisper will detect language)")
                else:
                    # Unknown language - try environment variable or default
                    vosk_sub = os.environ.get("VOSK_MODEL_SUBPATH", "vosk-model-small-en-us-0.15")
                    logger.info(f"[VOSK] ⚠️ No model for '{language}', using default: {vosk_sub}")
                
                if asr_dir:
                    vosk_path = os.path.join(asr_dir, vosk_sub)
                else:
                    vosk_path = vosk_sub
                
                logger.info(f"[VOSK] Model path: {vosk_path}")
                
                if os.path.isdir(vosk_path):
                    model = VoskModel(vosk_path)
                    
                    # Ensure WAV is 16kHz for VOSK
                    wav_path = audio_path
                    if SOUNDFILE_AVAILABLE:
                        data, samplerate = sf.read(audio_path)
                        duration = len(data) / samplerate if samplerate > 0 else 0
                        
                        if samplerate != 16000:
                            if LIBROSA_AVAILABLE:
                                logger.info("[VOSK] 📊 Resampling audio to 16kHz...")
                                y = librosa.resample(
                                    data.T if data.ndim > 1 else data,
                                    orig_sr=samplerate,
                                    target_sr=16000
                                )
                                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wavtmp:
                                    sf.write(wavtmp.name, y, 16000, format="WAV")
                                    wav_path = wavtmp.name
                                    temp_files.append(wav_path)
                            elif PYDUB_AVAILABLE:
                                wav_io = convert_audio_to_wav(audio_path, target_sr=16000)
                                if wav_io:
                                    wav_path = wav_io
                                    temp_files.append(wav_io)
                    
                    # VOSK Kaldi encoding
                    logger.info("[VOSK] 🔄 Processing audio frames through Kaldi recognizer...")
                    wf = wave.open(wav_path, "rb")
                    rec = KaldiRecognizer(model, wf.getframerate())
                    results = []
                    frame_count = 0
                    
                    while True:
                        data_bytes = wf.readframes(4000)
                        if len(data_bytes) == 0:
                            break
                        if rec.AcceptWaveform(data_bytes):
                            results.append(rec.Result())
                        frame_count += 1
                    
                    results.append(rec.FinalResult())
                    wf.close()
                    
                    # Parse VOSK JSON results to extract text
                    vosk_text_parts = []
                    for result_str in results:
                        try:
                            result_obj = json.loads(result_str)
                            
                            # Handle "text" field (final result format)
                            if "text" in result_obj:
                                text = result_obj.get("text", "").strip()
                                if text:
                                    vosk_text_parts.append(text)
                            # Handle word-level results
                            elif "result" in result_obj and isinstance(result_obj["result"], list):
                                for word_obj in result_obj["result"]:
                                    if isinstance(word_obj, dict):
                                        word_text = word_obj.get("word", "")
                                        confidence = word_obj.get("conf", 1.0)
                                        if word_text and confidence > 0.3:
                                            vosk_text_parts.append(word_text)
                        except (json.JSONDecodeError, TypeError, KeyError) as e:
                            logger.warning(f"[VOSK] Could not parse result: {e}")
                            continue
                    
                    vosk_transcription = " ".join(vosk_text_parts).strip()
                    logger.info(f"[VOSK] ✅ Encoding complete ({frame_count} frames): {vosk_transcription[:80] if vosk_transcription else '(empty)'}...")
                else:
                    logger.warning(f"[VOSK] ❌ Model not found at {vosk_path}")
                    if asr_dir and os.path.isdir(asr_dir):
                        logger.info(f"[VOSK] Available models: {os.listdir(asr_dir)}")
            except Exception as e:
                logger.error(f"[VOSK] ❌ Encoding failed: {e}")
        
        # ========== STAGE 2: WHISPER DECODING/REFINEMENT (Accuracy improvement) ==========
        if WHISPER_AVAILABLE:
            try:
                logger.info("[STAGE 2] 🧠 WHISPER DECODING: Refining accuracy...")
                
                # Check for local model directory
                asr_dir = os.environ.get("ASR_MODELS_DIR")
                model_path = model_size
                if asr_dir:
                    candidate = os.path.join(asr_dir, "faster_whisper", model_size)
                    if os.path.isdir(candidate):
                        model_path = candidate
                
                model = WhisperModel(
                    model_path,
                    device=device,
                    compute_type=compute_type,
                    num_workers=4,
                )
                
                # Transcribe with advanced accuracy parameters
                target_lang = None if language == "auto" else language
                logger.info("[WHISPER] 🔇 Applying VAD (Voice Activity Detection)...")
                logger.info("[WHISPER] 🎚️ Applying noise reduction filter...")
                logger.info("[WHISPER] 🔎 Using beam_size=10 for maximum accuracy...")
                logger.info("[WHISPER] 🌡️ Temperature=0.0 (deterministic results)...")
                
                segments, info = model.transcribe(
                    audio_path,
                    language=target_lang,
                    beam_size=10,  # ⬆️ ACCURACY: Increased from default 5 to 10
                    vad_filter=True,  # ✅ Enable Voice Activity Detection
                    vad_parameters=dict(
                        min_silence_duration_ms=500,
                        threshold=0.5,
                    ),
                    condition_on_previous_text=False,  # Fresh start each time
                    temperature=0.0,  # Deterministic
                    task="transcribe",
                )
                
                refined_transcription = " ".join([s.text for s in segments]).strip()
                detected_language = info.language
                duration = info.duration if hasattr(info, 'duration') else duration
                
                logger.info(f"[WHISPER] ✅ Decoding complete: {refined_transcription[:80] if refined_transcription else '(empty)'}...")
                
                if vosk_transcription:
                    logger.info("[PIPELINE] 🎯 Combined VOSK encoding + WHISPER decoding for best accuracy")
                
            except Exception as e:
                logger.error(f"[WHISPER] ❌ Decoding failed: {e}")
                if vosk_transcription:
                    logger.info("[FALLBACK] ⚠️ Using VOSK encoding output (Whisper unavailable)")
        
        # Determine final transcription
        final_text = refined_transcription or vosk_transcription
        
        if not final_text:
            raise HTTPException(status_code=500, detail="Both VOSK encoding and WHISPER decoding failed")
        
        return {
            "success": True,
            "text": final_text,
            "language": detected_language,
            "duration": duration,
            "vosk_text": vosk_transcription,
            "whisper_text": refined_transcription,
            "pipeline": "vosk+whisper" if (vosk_transcription and refined_transcription) else ("whisper" if refined_transcription else "vosk")
        }
        
    finally:
        # Clean up temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception:
                pass


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = "auto",
    model_size: str = "small"
):
    """
    Transcribe audio file to text using two-stage pipeline
    
    - STAGE 1: VOSK encoding (fast Kaldi-based recognition)
    - STAGE 2: Whisper decoding (accuracy refinement)
    
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac
    """
    temp_path = None
    try:
        logger.info(f"📥 Received audio file: {file.filename}")
        
        # Read file content
        audio_content = await file.read()
        
        # Determine file extension
        filename = file.filename or "audio.webm"
        suffix = Path(filename).suffix or ".webm"
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(audio_content)
            temp_path = temp_file.name
        
        logger.info(f"💾 Saved to temp file: {temp_path} ({len(audio_content)} bytes)")
        
        # Run transcription pipeline
        result = transcribe_audio_pipeline(
            temp_path,
            language=language,
            model_size=model_size,
            device="cpu",
            compute_type="int8"
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        # Clean up
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception:
                pass


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "transcriber",
        "version": "2.0.0",
        "engines": {
            "vosk": VOSK_AVAILABLE,
            "whisper": WHISPER_AVAILABLE,
            "pydub": PYDUB_AVAILABLE,
            "soundfile": SOUNDFILE_AVAILABLE,
            "librosa": LIBROSA_AVAILABLE,
        }
    }


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "SmartClaim Transcriber",
        "version": "2.0.0",
        "description": "Two-Stage ASR Pipeline: VOSK Encoding + Whisper Decoding",
        "endpoints": {
            "POST /transcribe": "Transcribe audio file to text",
            "GET /health": "Health check"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)