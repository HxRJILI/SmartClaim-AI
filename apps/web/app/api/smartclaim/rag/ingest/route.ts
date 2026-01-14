/**
 * RAG Ingestion Webhook API Route
 * Called when tickets are created, updated, or deleted to sync with vector store
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8004';

// Simple webhook secret for validation (should use proper webhook signatures in production)
const WEBHOOK_SECRET = process.env.RAG_WEBHOOK_SECRET || 'smartclaim-rag-webhook';

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const authHeader = request.headers.get('x-webhook-secret');
    if (authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { event, ticket_id } = body;
    
    if (!event || !ticket_id) {
      return NextResponse.json(
        { error: 'Event and ticket_id are required' },
        { status: 400 }
      );
    }
    
    let ragEndpoint: string;
    let method: 'POST' | 'DELETE' = 'POST';
    let ragBody: object | undefined;
    
    switch (event) {
      case 'ticket.created':
      case 'ticket.updated':
      case 'comment.added':
        ragEndpoint = `${RAG_SERVICE_URL}/ingest/ticket`;
        ragBody = { ticket_id };
        break;
        
      case 'ticket.deleted':
        ragEndpoint = `${RAG_SERVICE_URL}/delete/ticket/${ticket_id}`;
        method = 'DELETE';
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}` },
          { status: 400 }
        );
    }
    
    // Call RAG service
    const ragResponse = await fetch(ragEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: ragBody ? JSON.stringify(ragBody) : undefined,
    });
    
    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('RAG ingestion error:', errorText);
      return NextResponse.json(
        { error: 'RAG ingestion error', details: errorText },
        { status: ragResponse.status }
      );
    }
    
    const result = await ragResponse.json();
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${event} for ticket ${ticket_id}`,
      details: result,
    });
    
  } catch (error) {
    console.error('RAG webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Admin endpoint to trigger full sync
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Trigger full sync
    const ragResponse = await fetch(`${RAG_SERVICE_URL}/ingest/full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('RAG full sync error:', errorText);
      return NextResponse.json(
        { error: 'RAG full sync error', details: errorText },
        { status: ragResponse.status }
      );
    }
    
    const result = await ragResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Full sync triggered',
      details: result,
    });
    
  } catch (error) {
    console.error('RAG full sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
