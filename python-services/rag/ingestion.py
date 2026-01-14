"""
Ingestion Pipeline for SmartClaim RAG
Handles indexing tickets and comments from Supabase into the vector store
"""

from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime
from supabase import create_client, Client
from config import settings
from chunking import ticket_chunker
from vector_store import vector_store

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Ingestion pipeline for indexing SmartClaim data.
    
    Handles:
    - Full sync: Index all tickets
    - Incremental sync: Index new/updated tickets
    - Real-time webhooks: Index on ticket create/update
    - Deletion: Remove vectors when tickets are deleted
    """
    
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    async def full_sync(self) -> Dict[str, Any]:
        """
        Perform a full sync of all tickets.
        
        Returns:
            Statistics about the sync operation
        """
        logger.info("Starting full sync of all tickets")
        start_time = datetime.now()
        
        stats = {
            "total_tickets": 0,
            "total_chunks": 0,
            "errors": 0,
            "duration_seconds": 0,
        }
        
        try:
            # Fetch all tickets with their comments
            tickets = await self._fetch_all_tickets()
            stats["total_tickets"] = len(tickets)
            
            # Process tickets in batches
            batch_size = 50
            for i in range(0, len(tickets), batch_size):
                batch = tickets[i:i + batch_size]
                chunks = await self._process_ticket_batch(batch)
                
                if chunks:
                    count = vector_store.upsert_chunks(chunks)
                    stats["total_chunks"] += count
                
                logger.info(f"Processed batch {i // batch_size + 1}/{(len(tickets) + batch_size - 1) // batch_size}")
            
        except Exception as e:
            logger.error(f"Error during full sync: {e}")
            stats["errors"] += 1
        
        stats["duration_seconds"] = (datetime.now() - start_time).total_seconds()
        logger.info(f"Full sync completed: {stats}")
        return stats
    
    async def sync_ticket(self, ticket_id: str) -> Dict[str, Any]:
        """
        Sync a single ticket (for real-time updates).
        
        Args:
            ticket_id: UUID of the ticket to sync
            
        Returns:
            Statistics about the sync operation
        """
        logger.info(f"Syncing ticket {ticket_id}")
        
        stats = {
            "ticket_id": ticket_id,
            "chunks_created": 0,
            "success": False,
        }
        
        try:
            # Delete existing chunks for this ticket
            vector_store.delete_by_ticket_id(ticket_id)
            
            # Fetch ticket data
            ticket = await self._fetch_ticket(ticket_id)
            if not ticket:
                logger.warning(f"Ticket {ticket_id} not found")
                return stats
            
            # Fetch comments
            comments = await self._fetch_ticket_comments(ticket_id)
            
            # Create chunks
            chunks = ticket_chunker.chunk_ticket(ticket)
            
            # Add comment chunks
            ticket_metadata = {
                "ticket_id": ticket.get("id"),
                "ticket_number": ticket.get("ticket_number"),
                "created_by": ticket.get("created_by"),
                "department_id": ticket.get("assigned_to_department"),
            }
            
            for comment in comments:
                comment_chunks = ticket_chunker.chunk_comment(comment, ticket_metadata)
                chunks.extend(comment_chunks)
            
            # Upsert chunks
            if chunks:
                count = vector_store.upsert_chunks(chunks)
                stats["chunks_created"] = count
            
            stats["success"] = True
            logger.info(f"Synced ticket {ticket_id}: {stats['chunks_created']} chunks")
            
        except Exception as e:
            logger.error(f"Error syncing ticket {ticket_id}: {e}")
        
        return stats
    
    async def delete_ticket(self, ticket_id: str) -> bool:
        """
        Delete all vectors for a ticket.
        
        Args:
            ticket_id: UUID of the ticket to delete
            
        Returns:
            True if successful
        """
        logger.info(f"Deleting vectors for ticket {ticket_id}")
        return vector_store.delete_by_ticket_id(ticket_id)
    
    async def _fetch_all_tickets(self) -> List[Dict[str, Any]]:
        """Fetch all tickets from Supabase"""
        try:
            response = self.supabase.table("tickets").select("*").execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching tickets: {e}")
            return []
    
    async def _fetch_ticket(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single ticket"""
        try:
            response = self.supabase.table("tickets").select("*").eq("id", ticket_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching ticket {ticket_id}: {e}")
            return None
    
    async def _fetch_ticket_comments(self, ticket_id: str) -> List[Dict[str, Any]]:
        """Fetch comments for a ticket"""
        try:
            response = self.supabase.table("ticket_comments").select("*").eq("ticket_id", ticket_id).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching comments for ticket {ticket_id}: {e}")
            return []
    
    async def _process_ticket_batch(self, tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of tickets into chunks"""
        all_chunks = []
        
        for ticket in tickets:
            try:
                # Create ticket chunks
                chunks = ticket_chunker.chunk_ticket(ticket)
                all_chunks.extend(chunks)
                
                # Fetch and process comments
                comments = await self._fetch_ticket_comments(ticket["id"])
                ticket_metadata = {
                    "ticket_id": ticket.get("id"),
                    "ticket_number": ticket.get("ticket_number"),
                    "created_by": ticket.get("created_by"),
                    "department_id": ticket.get("assigned_to_department"),
                }
                
                for comment in comments:
                    comment_chunks = ticket_chunker.chunk_comment(comment, ticket_metadata)
                    all_chunks.extend(comment_chunks)
                    
            except Exception as e:
                logger.error(f"Error processing ticket {ticket.get('id')}: {e}")
        
        return all_chunks


# Singleton instance
ingestion_pipeline = IngestionPipeline()
