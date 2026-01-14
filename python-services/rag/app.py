"""
SmartClaim RAG Service - Main FastAPI Application
Multi-tenant RAG with strict role-based data isolation
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
from contextlib import asynccontextmanager

from config import settings
from tenant_filter import UserContext, UserRole
from vector_store import vector_store
from ingestion import ingestion_pipeline
from query_pipeline import query_pipeline

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting SmartClaim RAG Service...")
    
    # Initialize vector store (creates collection if needed)
    try:
        vector_store._ensure_collection()
        logger.info("Vector store initialized")
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")
    
    yield
    
    logger.info("Shutting down SmartClaim RAG Service...")


app = FastAPI(
    title="SmartClaim RAG Service",
    description="Multi-tenant RAG system with role-based data isolation",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request/Response Models
# ============================================

class UserContextRequest(BaseModel):
    """User context for tenant filtering"""
    user_id: str = Field(..., description="User's UUID")
    role: str = Field(..., description="User role: admin, department_manager, or worker")
    department_id: Optional[str] = Field(None, description="Department ID for managers")


class QueryRequest(BaseModel):
    """RAG query request"""
    query: str = Field(..., min_length=1, max_length=2000, description="User's question")
    user_context: UserContextRequest
    include_sources: bool = Field(True, description="Include source references")
    rerank: bool = Field(True, description="Rerank results for better relevance")


class QueryResponse(BaseModel):
    """RAG query response"""
    answer: str
    sources: List[Dict[str, Any]]
    context_used: bool
    num_chunks_retrieved: Optional[int] = None


class IngestTicketRequest(BaseModel):
    """Request to ingest a single ticket"""
    ticket_id: str = Field(..., description="Ticket UUID")


class SyncResponse(BaseModel):
    """Sync operation response"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class StatsResponse(BaseModel):
    """Vector store statistics"""
    total_vectors: int
    collection_status: str
    embedding_model: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    vector_store: str
    embedding_model: str


# ============================================
# Helper Functions
# ============================================

def parse_user_context(request: UserContextRequest) -> UserContext:
    """Convert request model to UserContext"""
    role_map = {
        "admin": UserRole.ADMIN,
        "department_manager": UserRole.DEPARTMENT_MANAGER,
        "manager": UserRole.DEPARTMENT_MANAGER,
        "worker": UserRole.WORKER,
    }
    
    role = role_map.get(request.role.lower())
    if role is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role: {request.role}. Must be admin, department_manager, or worker"
        )
    
    return UserContext(
        user_id=request.user_id,
        role=role,
        department_id=request.department_id,
    )


# ============================================
# Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check service health"""
    try:
        # Check vector store connection
        stats = vector_store.get_collection_stats()
        vs_status = "healthy"
    except Exception as e:
        logger.error(f"Vector store health check failed: {e}")
        vs_status = "unhealthy"
    
    return HealthResponse(
        status="healthy" if vs_status == "healthy" else "degraded",
        vector_store=vs_status,
        embedding_model=settings.EMBEDDING_MODEL,
    )


@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_rag(request: QueryRequest):
    """
    Execute a RAG query with multi-tenant filtering.
    
    The query is processed through:
    1. Tenant filter construction based on user role
    2. Pre-filtered vector similarity search
    3. Context building from relevant chunks
    4. LLM response generation
    
    Access Control:
    - Admin: Access to all tickets
    - Department Manager: Access to department tickets only
    - Worker: Access to their own tickets only
    """
    try:
        user_context = parse_user_context(request.user_context)
        
        role_str = user_context.role.value if hasattr(user_context.role, 'value') else str(user_context.role)
        logger.info(
            f"Query from user {user_context.user_id} "
            f"(role={role_str}): {request.query[:50]}..."
        )
        
        result = await query_pipeline.query(
            query=request.query,
            user_context=user_context,
            include_sources=request.include_sources,
            rerank=request.rerank,
        )
        
        return QueryResponse(**result)
        
    except Exception as e:
        logger.error(f"Query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/full", response_model=SyncResponse, tags=["Ingestion"])
async def full_sync(background_tasks: BackgroundTasks):
    """
    Trigger a full sync of all tickets from Supabase to vector store.
    
    This operation runs in the background and may take several minutes
    depending on the number of tickets.
    """
    try:
        # Run sync in background
        background_tasks.add_task(ingestion_pipeline.full_sync)
        
        return SyncResponse(
            success=True,
            message="Full sync started in background",
            details={"status": "processing"}
        )
    except Exception as e:
        logger.error(f"Full sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/ticket", response_model=SyncResponse, tags=["Ingestion"])
async def sync_ticket(request: IngestTicketRequest):
    """
    Sync a single ticket to the vector store.
    
    Use this endpoint when:
    - A new ticket is created
    - A ticket is updated
    - Comments are added to a ticket
    """
    try:
        result = await ingestion_pipeline.sync_ticket(request.ticket_id)
        
        return SyncResponse(
            success=result.get("status") == "success",
            message=result.get("message", "Ticket synced"),
            details=result,
        )
    except Exception as e:
        logger.error(f"Ticket sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete/ticket/{ticket_id}", response_model=SyncResponse, tags=["Ingestion"])
async def delete_ticket(ticket_id: str):
    """
    Remove a ticket from the vector store.
    
    Use this endpoint when a ticket is deleted from the system.
    """
    try:
        await ingestion_pipeline.delete_ticket(ticket_id)
        
        return SyncResponse(
            success=True,
            message=f"Ticket {ticket_id} removed from vector store",
        )
    except Exception as e:
        logger.error(f"Delete ticket error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats", response_model=StatsResponse, tags=["Admin"])
async def get_stats():
    """
    Get vector store statistics.
    
    Returns:
    - Total number of vectors
    - Collection status
    - Embedding model info
    """
    try:
        stats = vector_store.get_collection_stats()
        
        return StatsResponse(
            total_vectors=stats.get("vectors_count", 0),
            collection_status="healthy" if stats else "unknown",
            embedding_model=settings.EMBEDDING_MODEL,
        )
    except Exception as e:
        logger.error(f"Stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/recreate-collection", response_model=SyncResponse, tags=["Admin"])
async def recreate_collection():
    """
    Recreate the vector collection.
    
    WARNING: This will delete all existing vectors!
    Use only for development/testing or to fix collection issues.
    """
    try:
        # Delete existing collection
        try:
            vector_store.client.delete_collection(settings.QDRANT_COLLECTION)
            logger.info(f"Deleted collection {settings.QDRANT_COLLECTION}")
        except Exception:
            pass
        
        # Recreate
        vector_store._ensure_collection()
        
        return SyncResponse(
            success=True,
            message="Collection recreated successfully",
        )
    except Exception as e:
        logger.error(f"Recreate collection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# WEBHOOK ENDPOINTS - For automatic sync from Supabase
# =============================================================================

class WebhookPayload(BaseModel):
    """Supabase webhook payload"""
    type: str = Field(..., description="Event type: INSERT, UPDATE, DELETE")
    table: str = Field(..., description="Table name")
    record: Optional[Dict[str, Any]] = Field(None, description="New/updated record")
    old_record: Optional[Dict[str, Any]] = Field(None, description="Old record (for UPDATE/DELETE)")
    schema_name: str = Field("public", alias="schema")


@app.post("/webhook/ticket", tags=["Webhooks"])
async def webhook_ticket_change(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """
    Webhook endpoint for ticket changes from Supabase.
    
    Automatically syncs tickets to RAG when:
    - A ticket is created (INSERT)
    - A ticket is updated (UPDATE)
    - A ticket is deleted (DELETE)
    
    Configure in Supabase with Database Webhooks or Edge Functions.
    """
    logger.info(f"Webhook received: {payload.type} on {payload.table}")
    
    try:
        if payload.type == "DELETE":
            # Delete from vector store
            ticket_id = payload.old_record.get("id") if payload.old_record else None
            if ticket_id:
                background_tasks.add_task(ingestion_pipeline.delete_ticket, ticket_id)
                logger.info(f"Scheduled deletion of ticket {ticket_id}")
                return {"status": "accepted", "action": "delete", "ticket_id": ticket_id}
        
        elif payload.type in ["INSERT", "UPDATE"]:
            # Sync to vector store
            ticket_id = payload.record.get("id") if payload.record else None
            if ticket_id:
                background_tasks.add_task(ingestion_pipeline.sync_ticket, ticket_id)
                logger.info(f"Scheduled sync of ticket {ticket_id}")
                return {"status": "accepted", "action": "sync", "ticket_id": ticket_id}
        
        return {"status": "ignored", "reason": f"Unknown event type: {payload.type}"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/comment", tags=["Webhooks"])
async def webhook_comment_change(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """
    Webhook endpoint for comment changes from Supabase.
    
    Automatically resyncs the parent ticket when comments are added/updated/deleted.
    """
    logger.info(f"Comment webhook received: {payload.type} on {payload.table}")
    
    try:
        # Get ticket_id from the comment record
        if payload.type == "DELETE":
            ticket_id = payload.old_record.get("ticket_id") if payload.old_record else None
        else:
            ticket_id = payload.record.get("ticket_id") if payload.record else None
        
        if ticket_id:
            background_tasks.add_task(ingestion_pipeline.sync_ticket, ticket_id)
            logger.info(f"Scheduled resync of ticket {ticket_id} due to comment change")
            return {"status": "accepted", "action": "resync", "ticket_id": ticket_id}
        
        return {"status": "ignored", "reason": "No ticket_id found in payload"}
        
    except Exception as e:
        logger.error(f"Comment webhook error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with service info"""
    return {
        "service": "SmartClaim RAG Service",
        "version": "1.0.0",
        "description": "Multi-tenant RAG with role-based data isolation",
        "docs_url": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
    )
