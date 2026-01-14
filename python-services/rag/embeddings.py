"""
Embedding Service for SmartClaim RAG
Handles text embedding using sentence-transformers
"""

from typing import List, Union
from sentence_transformers import SentenceTransformer
import numpy as np
import logging
from config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Embedding service using sentence-transformers.
    Uses the same model for both indexing and querying to ensure consistency.
    """
    
    _instance = None
    _model = None
    
    def __new__(cls):
        """Singleton pattern to avoid loading model multiple times"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._model is None:
            self._load_model()
    
    def _load_model(self):
        """Load the embedding model"""
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        try:
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info(f"Embedding model loaded successfully. Dimension: {settings.EMBEDDING_DIMENSION}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return [0.0] * settings.EMBEDDING_DIMENSION
        
        embedding = self._model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing).
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        # Filter out empty texts and keep track of indices
        valid_texts = []
        valid_indices = []
        for i, text in enumerate(texts):
            if text and text.strip():
                valid_texts.append(text)
                valid_indices.append(i)
        
        if not valid_texts:
            return [[0.0] * settings.EMBEDDING_DIMENSION for _ in texts]
        
        # Batch encode
        embeddings = self._model.encode(valid_texts, convert_to_numpy=True, show_progress_bar=False)
        
        # Reconstruct results with zeros for empty texts
        results = [[0.0] * settings.EMBEDDING_DIMENSION for _ in texts]
        for idx, embedding in zip(valid_indices, embeddings):
            results[idx] = embedding.tolist()
        
        return results
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0 to 1)
        """
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))


# Singleton instance
embedding_service = EmbeddingService()
