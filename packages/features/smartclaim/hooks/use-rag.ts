/**
 * useRAG - Hook for querying the Multi-Tenant RAG service
 * Provides intelligent search across tickets with proper access control
 */

'use client';

import { useState, useCallback } from 'react';

export interface RAGSource {
  ticket_id: string;
  ticket_number?: string;
  category?: string;
  chunk_type?: string;
  relevance_score?: number;
}

export interface RAGQueryResult {
  answer: string;
  sources: RAGSource[];
  context_used: boolean;
  num_chunks_retrieved?: number;
}

export interface UseRAGOptions {
  onSuccess?: (result: RAGQueryResult) => void;
  onError?: (error: Error) => void;
}

export function useRAG(options?: UseRAGOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<RAGQueryResult | null>(null);

  const query = useCallback(async (queryText: string): Promise<RAGQueryResult | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/smartclaim/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryText }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'RAG query failed');
      }
      
      const data = await response.json();
      setResult(data);
      options?.onSuccess?.(data);
      return data;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
      return null;
      
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    query,
    result,
    isLoading,
    error,
    reset,
  };
}

/**
 * useRAGSync - Hook for syncing tickets to RAG service
 * Used by admin to trigger full sync
 */
export function useRAGSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const triggerFullSync = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/smartclaim/rag/ingest', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'RAG sync failed');
      }
      
      return true;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncTicket = useCallback(async (ticketId: string, event: 'ticket.created' | 'ticket.updated' | 'comment.added'): Promise<boolean> => {
    try {
      // This would typically be called server-side via webhook
      // But can be called from frontend for manual sync
      const response = await fetch('/api/smartclaim/rag/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'smartclaim-rag-webhook', // Should come from env in production
        },
        body: JSON.stringify({ event, ticket_id: ticketId }),
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    triggerFullSync,
    syncTicket,
    isLoading,
    error,
  };
}
