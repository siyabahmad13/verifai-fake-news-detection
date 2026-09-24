# ==============================================================================
# VERIFAI Backend — Production Dockerfile
# Optimized multi-stage build running non-root Gunicorn WSGI service
# ==============================================================================

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Download required NLTK tokenizers and stopwords into standard location
RUN python -c "import nltk; nltk.download('stopwords'); nltk.download('punkt'); nltk.download('punkt_tab')"

# Copy application source code
COPY . .

# Create non-root system user for security
RUN useradd -m -u 1000 verifai && \
    mkdir -p /app/staticfiles /app/media && \
    chown -R verifai:verifai /app

USER verifai

EXPOSE 8000

RUN chmod +x /app/docker-entrypoint.sh 2>/dev/null || true

ENTRYPOINT ["/app/docker-entrypoint.sh"]
