"""
Text Chunking Service for SmartClaim RAG
Handles intelligent text splitting for optimal retrieval
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import re
import logging
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """Represents a chunk of text with metadata"""
    content: str
    chunk_index: int
    start_char: int
    end_char: int
    metadata: Dict[str, Any]


class ChunkingService:
    """
    Intelligent text chunking service for RAG.
    
    Features:
    - Recursive character splitting with semantic boundaries
    - Overlap for context preservation
    - Metadata preservation across chunks
    """
    
    def __init__(
        self, 
        chunk_size: int = None, 
        chunk_overlap: int = None
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        # Separators in order of preference (most to least semantic)
        self.separators = [
            "\n\n",  # Paragraphs
            "\n",    # Lines
            ". ",    # Sentences
            "? ",    # Questions
            "! ",    # Exclamations
            "; ",    # Semi-colons
            ", ",    # Commas
            " ",     # Words
            ""       # Characters
        ]
    
    def chunk_text(
        self, 
        text: str, 
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[TextChunk]:
        """
        Split text into chunks with overlap.
        
        Args:
            text: Text to chunk
            metadata: Metadata to attach to each chunk
            
        Returns:
            List of TextChunk objects
        """
        if not text or not text.strip():
            return []
        
        metadata = metadata or {}
        chunks = []
        
        # Recursive splitting
        raw_chunks = self._recursive_split(text, self.separators)
        
        # Merge small chunks and handle overlap
        merged_chunks = self._merge_chunks(raw_chunks)
        
        # Create TextChunk objects with metadata
        current_pos = 0
        for i, chunk_text in enumerate(merged_chunks):
            start_pos = text.find(chunk_text, current_pos)
            if start_pos == -1:
                start_pos = current_pos
            
            chunk = TextChunk(
                content=chunk_text.strip(),
                chunk_index=i,
                start_char=start_pos,
                end_char=start_pos + len(chunk_text),
                metadata={
                    **metadata,
                    "chunk_index": i,
                    "total_chunks": len(merged_chunks)
                }
            )
            chunks.append(chunk)
            current_pos = start_pos + 1
        
        logger.debug(f"Created {len(chunks)} chunks from text of length {len(text)}")
        return chunks
    
    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """
        Recursively split text using semantic separators.
        """
        if not text:
            return []
        
        if len(text) <= self.chunk_size:
            return [text]
        
        if not separators:
            # No more separators, split by character
            return [text[i:i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        separator = separators[0]
        remaining_separators = separators[1:]
        
        if separator == "":
            # Character-level split
            return [text[i:i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        splits = text.split(separator)
        
        result = []
        current_chunk = ""
        
        for split in splits:
            if not split:
                continue
            
            test_chunk = current_chunk + separator + split if current_chunk else split
            
            if len(test_chunk) <= self.chunk_size:
                current_chunk = test_chunk
            else:
                if current_chunk:
                    result.append(current_chunk)
                
                if len(split) > self.chunk_size:
                    # Recursively split this part
                    sub_chunks = self._recursive_split(split, remaining_separators)
                    result.extend(sub_chunks)
                    current_chunk = ""
                else:
                    current_chunk = split
        
        if current_chunk:
            result.append(current_chunk)
        
        return result
    
    def _merge_chunks(self, chunks: List[str]) -> List[str]:
        """
        Merge small chunks and add overlap between chunks.
        """
        if not chunks:
            return []
        
        merged = []
        
        for i, chunk in enumerate(chunks):
            if not chunk.strip():
                continue
            
            # Add overlap from previous chunk
            if i > 0 and merged:
                overlap_text = self._get_overlap(merged[-1], is_end=True)
                chunk = overlap_text + chunk
            
            merged.append(chunk.strip())
        
        return merged
    
    def _get_overlap(self, text: str, is_end: bool = True) -> str:
        """
        Get overlap text from the end or beginning of a chunk.
        """
        if len(text) <= self.chunk_overlap:
            return text
        
        if is_end:
            # Get overlap from end of text
            overlap = text[-self.chunk_overlap:]
            # Try to break at word boundary
            space_idx = overlap.find(" ")
            if space_idx > 0:
                overlap = overlap[space_idx + 1:]
            return overlap + " "
        else:
            # Get overlap from beginning of text
            overlap = text[:self.chunk_overlap]
            # Try to break at word boundary
            space_idx = overlap.rfind(" ")
            if space_idx > 0:
                overlap = overlap[:space_idx]
            return " " + overlap


class TicketChunker:
    """
    Specialized chunker for SmartClaim tickets.
    Creates structured chunks with proper metadata.
    """
    
    def __init__(self):
        self.chunking_service = ChunkingService()
    
    def chunk_ticket(self, ticket: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create chunks from a ticket with all necessary metadata.
        
        Each chunk will contain:
        - content: The actual text content
        - ticket_id: UUID of the ticket
        - ticket_number: Human-readable ticket number
        - created_by: UUID of the worker who created the ticket
        - department_id: UUID of the assigned department
        - category: Ticket category
        - priority: Ticket priority
        - status: Current ticket status
        - chunk_type: Type of content (title, description, comment, resolution)
        """
        chunks = []
        
        # Base metadata for all chunks from this ticket
        base_metadata = {
            "ticket_id": ticket.get("id"),
            "ticket_number": ticket.get("ticket_number"),
            "created_by": ticket.get("created_by"),
            "department_id": ticket.get("assigned_to_department"),
            "category": ticket.get("category"),
            "priority": ticket.get("priority"),
            "status": ticket.get("status"),
            "created_at": ticket.get("created_at"),
        }
        
        # Chunk 1: Title and Summary with key metadata for searchability
        title = ticket.get("title", "")
        if title:
            # Include status, category, priority in content for better semantic search
            status = ticket.get("status", "unknown")
            category = ticket.get("category", "")
            priority = ticket.get("priority", "")
            
            # Build a rich, searchable content string
            content_parts = [f"Ticket {ticket.get('ticket_number', '')}: {title}"]
            content_parts.append(f"Status: {status}")
            if category:
                content_parts.append(f"Category: {category}")
            if priority:
                content_parts.append(f"Priority: {priority}")
            
            chunks.append({
                "content": " | ".join(content_parts),
                "metadata": {
                    **base_metadata,
                    "chunk_type": "title",
                }
            })
        
        # Chunk 2: Description (may be multiple chunks)
        description = ticket.get("description", "")
        if description:
            desc_chunks = self.chunking_service.chunk_text(
                description,
                metadata={**base_metadata, "chunk_type": "description"}
            )
            for chunk in desc_chunks:
                chunks.append({
                    "content": chunk.content,
                    "metadata": chunk.metadata
                })
        
        # Chunk 3: AI Summary if available
        ai_summary = ticket.get("ai_summary", "")
        if ai_summary:
            chunks.append({
                "content": f"AI Summary: {ai_summary}",
                "metadata": {
                    **base_metadata,
                    "chunk_type": "ai_summary",
                }
            })
        
        # Chunk 4: Resolution report if available
        resolution = ticket.get("resolution_report", "")
        if resolution:
            res_chunks = self.chunking_service.chunk_text(
                resolution,
                metadata={**base_metadata, "chunk_type": "resolution"}
            )
            for chunk in res_chunks:
                chunks.append({
                    "content": f"Resolution: {chunk.content}",
                    "metadata": chunk.metadata
                })
        
        logger.info(f"Created {len(chunks)} chunks for ticket {ticket.get('ticket_number')}")
        return chunks
    
    def chunk_comment(
        self, 
        comment: Dict[str, Any], 
        ticket_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Create chunks from a ticket comment.
        """
        chunks = []
        
        comment_text = comment.get("comment", "")
        if not comment_text:
            return chunks
        
        metadata = {
            **ticket_metadata,
            "comment_id": comment.get("id"),
            "comment_user_id": comment.get("user_id"),
            "chunk_type": "comment",
        }
        
        comment_chunks = self.chunking_service.chunk_text(comment_text, metadata)
        for chunk in comment_chunks:
            chunks.append({
                "content": f"Comment: {chunk.content}",
                "metadata": chunk.metadata
            })
        
        return chunks


# Singleton instances
chunking_service = ChunkingService()
ticket_chunker = TicketChunker()
