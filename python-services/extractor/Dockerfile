# python-services/extractor/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OCR and PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create directory for PaddleOCR models
RUN mkdir -p /app/models/paddleocr/det /app/models/paddleocr/rec /app/models/paddleocr/cls

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

# Pre-download PaddleOCR models (optional - uncomment to include in image)
# RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]