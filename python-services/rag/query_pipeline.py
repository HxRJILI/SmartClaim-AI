"""
Query Pipeline for SmartClaim RAG
Handles retrieval, context building, and response generation
"""

from typing import List, Dict, Any, Optional
import logging
from google import genai
from config import settings
from vector_store import vector_store
from tenant_filter import UserContext, UserRole

logger = logging.getLogger(__name__)


class QueryPipeline:
    """
    Query pipeline for RAG with multi-tenant support.
    
    Flow:
    1. Extract user context
    2. Build tenant filter
    3. Embed query
    4. Vector search with pre-filtering
    5. Retrieve top-K chunks
    6. (Optional) Rerank results
    7. Build context
    8. Generate response with LLM
    """
    
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    def _is_broad_query(self, query: str) -> bool:
        """Detect if query is asking for all/summary of tickets or analytical queries"""
        broad_patterns = [
            # General ticket queries
            "my tickets", "all tickets", "ticket history", "summarize",
            "list tickets", "show tickets", "what tickets", "tickets i have",
            "my claims", "my submissions", "overview", "all my",
            "old tickets", "past tickets", "previous tickets", "ticket i",
            "tickets that i", "insight", "history of my", "my history",
            # Status-based queries
            "resolved tickets", "in process", "in_process", "new tickets",
            "open tickets", "closed tickets", "pending tickets",
            "tickets with status", "status of tickets",
            # Category/department queries
            "departments", "categories", "maintenance tickets",
            "safety tickets", "tickets by category", "tickets by department",
            # Analytical queries
            "how many", "count", "total", "statistics", "analysis"
        ]
        query_lower = query.lower()
        return any(pattern in query_lower for pattern in broad_patterns)
    
    async def query(
        self,
        query: str,
        user_context: UserContext,
        include_sources: bool = True,
        rerank: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute a RAG query with tenant isolation.
        
        Args:
            query: User's question
            user_context: User context for filtering
            include_sources: Whether to include source references
            rerank: Whether to rerank results
            
        Returns:
            Response with answer and sources
        """
        logger.info(f"Processing query for user {user_context.user_id}: {query[:50]}...")
        
        # Check if this is a broad query asking for all tickets
        is_broad = self._is_broad_query(query)
        
        # Step 1-4: Search with tenant filtering (pre-filtering!)
        # For broad queries, use no score threshold to get all user tickets
        search_results = vector_store.search(
            query=query,
            user_context=user_context,
            top_k=settings.TOP_K_RESULTS,
            score_threshold=0.0 if is_broad else None,  # No threshold for broad queries
        )
        
        if not search_results:
            logger.info("No relevant documents found")
            return {
                "answer": self._generate_no_context_response(query, user_context),
                "sources": [],
                "context_used": False,
            }
        
        # Step 5: (Optional) Rerank results - skip for broad queries
        if rerank and not is_broad and len(search_results) > settings.RERANK_TOP_K:
            search_results = await self._rerank_results(query, search_results)
        
        # Step 6: Build context
        context = self._build_context(search_results[:settings.RERANK_TOP_K])
        
        # Step 7: Generate response
        answer = await self._generate_response(query, context, user_context)
        
        # Prepare sources
        sources = []
        if include_sources:
            sources = self._format_sources(search_results[:settings.RERANK_TOP_K])
        
        return {
            "answer": answer,
            "sources": sources,
            "context_used": True,
            "num_chunks_retrieved": len(search_results),
        }
    
    async def _rerank_results(
        self,
        query: str,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rerank results using LLM for better relevance.
        """
        logger.debug(f"Reranking {len(results)} results")
        
        # Simple reranking using LLM scoring
        # For production, consider using a cross-encoder model
        try:
            rerank_prompt = f"""Rate the relevance of each document to the query on a scale of 0-10.

Query: {query}

Documents:
"""
            for i, result in enumerate(results):
                rerank_prompt += f"\n[{i}] {result['content'][:200]}...\n"
            
            rerank_prompt += "\nRespond with just the document numbers in order of relevance (most relevant first), comma-separated. Example: 2,0,3,1,4"
            
            chat = self.client.chats.create(model="gemini-2.5-flash")
            response = chat.send_message(rerank_prompt)
            
            # Parse response to get ordering
            try:
                order = [int(x.strip()) for x in response.text.split(",")]
                reranked = [results[i] for i in order if i < len(results)]
                # Add any missing results at the end
                for i, result in enumerate(results):
                    if i not in order:
                        reranked.append(result)
                return reranked
            except:
                return results
                
        except Exception as e:
            logger.error(f"Error reranking: {e}")
            return results
    
    def _build_context(self, results: List[Dict[str, Any]]) -> str:
        """
        Build context string from search results.
        Deduplicates and formats for LLM.
        """
        seen_content = set()
        context_parts = []
        
        for result in results:
            content = result.get("content", "")
            
            # Simple deduplication
            content_hash = hash(content[:100])
            if content_hash in seen_content:
                continue
            seen_content.add(content_hash)
            
            # Format with metadata
            metadata = result.get("metadata", {})
            ticket_num = metadata.get("ticket_number", "Unknown")
            chunk_type = metadata.get("chunk_type", "content")
            
            context_parts.append(f"[Ticket {ticket_num} - {chunk_type}]\n{content}")
        
        return "\n\n---\n\n".join(context_parts)
    
    async def _generate_response(
        self,
        query: str,
        context: str,
        user_context: UserContext
    ) -> str:
        """
        Generate response using Gemini with RAG context.
        """
        # Build system prompt based on role
        role_prompts = {
            UserRole.ADMIN: "You are an AI assistant for SmartClaim administrators. You have access to all tickets across all departments.",
            UserRole.DEPARTMENT_MANAGER: "You are an AI assistant for SmartClaim department managers. You help analyze and manage department tickets.",
            UserRole.WORKER: "You are an AI assistant for SmartClaim workers. You help with ticket-related questions.",
        }
        
        role = UserRole(user_context.role) if isinstance(user_context.role, str) else user_context.role
        system_prompt = role_prompts.get(role, role_prompts[UserRole.WORKER])
        
        full_prompt = f"""{system_prompt}

Use the following context from the ticket database to answer the user's question.
If the context doesn't contain relevant information, say so and provide general guidance.
Always be helpful, accurate, and concise.

CONTEXT:
{context}

USER QUESTION: {query}

ASSISTANT:"""
        
        try:
            chat = self.client.chats.create(model="gemini-2.5-flash")
            response = chat.send_message(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I apologize, but I encountered an error generating a response. Please try again."
    
    def _generate_no_context_response(self, query: str, user_context: UserContext) -> str:
        """Generate response when no relevant context is found"""
        role = UserRole(user_context.role) if isinstance(user_context.role, str) else user_context.role
        
        if role == UserRole.WORKER:
            return f"""I couldn't find any relevant tickets matching your query. This could mean:
- You haven't submitted any tickets yet
- Your existing tickets don't contain information related to "{query[:50]}"

Would you like to submit a new ticket or rephrase your question?"""
        
        elif role == UserRole.DEPARTMENT_MANAGER:
            return f"""I couldn't find any tickets in your department matching "{query[:50]}".

This could mean:
- No tickets have been assigned to your department yet
- The tickets don't contain information related to your query

Would you like me to help with something else?"""
        
        else:  # Admin
            return f"""I couldn't find any tickets matching "{query[:50]}" in the system.

Would you like me to:
- Search with different keywords?
- Provide general guidance on the topic?"""
    
    def _format_sources(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format search results as source references"""
        sources = []
        seen_tickets = set()
        
        for result in results:
            metadata = result.get("metadata", {})
            ticket_id = metadata.get("ticket_id")
            
            if ticket_id and ticket_id not in seen_tickets:
                seen_tickets.add(ticket_id)
                sources.append({
                    "ticket_id": ticket_id,
                    "ticket_number": metadata.get("ticket_number"),
                    "category": metadata.get("category"),
                    "chunk_type": metadata.get("chunk_type"),
                    "relevance_score": result.get("score", 0),
                })
        
        return sources


# Singleton instance
query_pipeline = QueryPipeline()
