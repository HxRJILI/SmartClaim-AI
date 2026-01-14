"""
SmartClaim RAG Service Configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Service Configuration
    SERVICE_NAME: str = "smartclaim-rag"
    SERVICE_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"
    
    # Qdrant Configuration
    QDRANT_HOST: str = "qdrant"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "smartclaim_tickets"
    QDRANT_GRPC_PORT: int = 6334
    
    # Embedding Configuration
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # Chunking Configuration
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    # RAG Configuration
    TOP_K_RESULTS: int = 10
    SIMILARITY_THRESHOLD: float = 0.2
    RERANK_TOP_K: int = 5
    
    # Supabase Configuration
    SUPABASE_URL: str = "http://host.docker.internal:54321"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
    SUPABASE_DB_HOST: str = "host.docker.internal"
    SUPABASE_DB_PORT: int = 54322
    SUPABASE_DB_NAME: str = "postgres"
    SUPABASE_DB_USER: str = "postgres"
    SUPABASE_DB_PASSWORD: str = "postgres"
    
    # Gemini Configuration (for reranking/generation)
    GEMINI_API_KEY: str = "AIzaSyBkuu6HZHTrMqtni0rsqepjhyyppu5Oh1U"
    
    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
