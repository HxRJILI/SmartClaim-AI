"""
Vector Store Service for SmartClaim RAG
Manages Qdrant vector database operations with tenant isolation
"""

from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchParams,
    PayloadSchemaType,
)
from qdrant_client.http.exceptions import UnexpectedResponse
import uuid
import logging
from config import settings
from embeddings import embedding_service
from tenant_filter import TenantFilterManager, UserContext

logger = logging.getLogger(__name__)


class VectorStoreService:
    """
    Vector store service using Qdrant for multi-tenant RAG.
    
    Features:
    - Pre-filtering for tenant isolation
    - Batch upsert operations
    - Delete by metadata
    - Similarity search with score threshold
    """
    
    _instance = None
    _client = None
    
    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._connect()
    
    def _connect(self):
        """Connect to Qdrant"""
        logger.info(f"Connecting to Qdrant at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
        try:
            self._client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
                timeout=30,
            )
            logger.info("Connected to Qdrant successfully")
            self._ensure_collection()
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise
    
    def _ensure_collection(self):
        """Ensure the collection exists with proper configuration"""
        collection_name = settings.QDRANT_COLLECTION_NAME
        
        try:
            collections = self._client.get_collections().collections
            collection_names = [c.name for c in collections]
            
            if collection_name not in collection_names:
                logger.info(f"Creating collection: {collection_name}")
                self._client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=Distance.COSINE,
                    ),
                )
                
                # Create payload indexes for filtering
                self._create_indexes()
                logger.info(f"Collection {collection_name} created successfully")
            else:
                logger.info(f"Collection {collection_name} already exists")
                
        except Exception as e:
            logger.error(f"Error ensuring collection: {e}")
            raise
    
    def _create_indexes(self):
        """Create payload indexes for efficient filtering"""
        collection_name = settings.QDRANT_COLLECTION_NAME
        
        # Fields that need indexing for tenant filtering
        index_fields = [
            ("created_by", PayloadSchemaType.KEYWORD),
            ("department_id", PayloadSchemaType.KEYWORD),
            ("ticket_id", PayloadSchemaType.KEYWORD),
            ("category", PayloadSchemaType.KEYWORD),
            ("priority", PayloadSchemaType.KEYWORD),
            ("status", PayloadSchemaType.KEYWORD),
            ("chunk_type", PayloadSchemaType.KEYWORD),
        ]
        
        for field_name, field_type in index_fields:
            try:
                self._client.create_payload_index(
                    collection_name=collection_name,
                    field_name=field_name,
                    field_schema=field_type,
                )
                logger.info(f"Created index for field: {field_name}")
            except Exception as e:
                logger.debug(f"Index for {field_name} may already exist: {e}")
    
    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        """
        Upsert chunks into the vector store.
        
        Args:
            chunks: List of chunks with 'content' and 'metadata'
            
        Returns:
            Number of chunks upserted
        """
        if not chunks:
            return 0
        
        # Generate embeddings in batch
        texts = [chunk["content"] for chunk in chunks]
        embeddings = embedding_service.embed_texts(texts)
        
        # Create points
        points = []
        for chunk, embedding in zip(chunks, embeddings):
            point_id = str(uuid.uuid4())
            
            # Add content to metadata for retrieval
            payload = {
                **chunk["metadata"],
                "content": chunk["content"],
            }
            
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            )
        
        # Upsert to Qdrant
        try:
            self._client.upsert(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points=points,
            )
            logger.info(f"Upserted {len(points)} chunks to vector store")
            return len(points)
        except Exception as e:
            logger.error(f"Error upserting chunks: {e}")
            raise
    
    def delete_by_ticket_id(self, ticket_id: str) -> bool:
        """
        Delete all chunks for a specific ticket.
        Used when a ticket is updated or deleted.
        
        Args:
            ticket_id: UUID of the ticket
            
        Returns:
            True if successful
        """
        try:
            self._client.delete(
                collection_name=settings.QDRANT_COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="ticket_id",
                            match=MatchValue(value=ticket_id),
                        )
                    ]
                ),
            )
            logger.info(f"Deleted chunks for ticket {ticket_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting chunks for ticket {ticket_id}: {e}")
            return False
    
    def search(
        self,
        query: str,
        user_context: UserContext,
        top_k: int = None,
        score_threshold: float = None,
        additional_filter: Optional[Filter] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant chunks with tenant isolation.
        
        CRITICAL: Pre-filtering is applied BEFORE similarity search
        to ensure no unauthorized data is retrieved.
        
        Args:
            query: Search query
            user_context: User context for tenant filtering
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            additional_filter: Additional filter conditions
            
        Returns:
            List of matching chunks with scores
        """
        top_k = top_k or settings.TOP_K_RESULTS
        # Use explicit None check - 0.0 means "no threshold", not "use default"
        if score_threshold is None:
            score_threshold = settings.SIMILARITY_THRESHOLD
        
        # Step 1: Build tenant filter (PRE-FILTERING)
        tenant_filter_manager = TenantFilterManager()
        tenant_filter = tenant_filter_manager.build_filter(user_context)
        
        # Combine with additional filter if provided
        if tenant_filter and additional_filter:
            must_conditions = []
            if tenant_filter.must:
                must_conditions.extend(tenant_filter.must)
            if additional_filter.must:
                must_conditions.extend(additional_filter.must)
            combined_filter = Filter(must=must_conditions)
        elif tenant_filter:
            combined_filter = tenant_filter
        else:
            combined_filter = additional_filter
        
        # Step 2: Embed query
        query_embedding = embedding_service.embed_text(query)
        
        # Step 3: Search with pre-filtering
        try:
            # Use query_points for newer qdrant-client versions
            # Build query kwargs - only include score_threshold if it's explicitly needed
            query_kwargs = {
                "collection_name": settings.QDRANT_COLLECTION_NAME,
                "query": query_embedding,
                "query_filter": combined_filter,
                "limit": top_k,
                "with_payload": True,
            }
            # Only add score_threshold if it's a positive value
            # When score_threshold is 0 (broad queries), exclude threshold entirely
            if score_threshold is not None and score_threshold > 0:
                query_kwargs["score_threshold"] = score_threshold
            
            logger.info(f"Query kwargs: limit={top_k}, has_filter={combined_filter is not None}, threshold_applied={score_threshold is not None and score_threshold > 0}")
            
            results = self._client.query_points(**query_kwargs).points
            
            # Step 4: Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "id": result.id,
                    "score": result.score,
                    "content": result.payload.get("content", ""),
                    "metadata": {
                        k: v for k, v in result.payload.items() 
                        if k != "content"
                    },
                })
            
            # Step 5: Post-filter as defense in depth
            filtered_results = tenant_filter_manager.filter_results(
                user_context, formatted_results
            )
            
            logger.info(
                f"Search returned {len(filtered_results)} results for user "
                f"{user_context.user_id} (role: {user_context.role})"
            )
            
            return filtered_results
            
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            info = self._client.get_collection(settings.QDRANT_COLLECTION_NAME)
            # Handle different qdrant-client versions
            vectors_count = getattr(info, 'vectors_count', None)
            if vectors_count is None:
                vectors_count = getattr(info, 'points_count', 0)
            points_count = getattr(info, 'points_count', vectors_count)
            status = getattr(info.status, 'name', str(info.status)) if hasattr(info, 'status') else 'unknown'
            return {
                "vectors_count": vectors_count,
                "points_count": points_count,
                "status": status,
                "collection_name": settings.QDRANT_COLLECTION_NAME,
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {}


# Singleton instance
vector_store = VectorStoreService()
