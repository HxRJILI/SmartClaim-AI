# python-services/transcriber/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create directory for ASR models
RUN mkdir -p /app/models

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Environment variables for model paths
ENV ASR_MODELS_DIR=/app/models
ENV VOSK_MODEL_SUBPATH=vosk-model-small-en-us-0.15

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]