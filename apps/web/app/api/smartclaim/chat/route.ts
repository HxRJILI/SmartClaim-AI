// apps/web/app/api/smartclaim/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Service configuration
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:8002';
const REQUEST_TIMEOUT_MS = 45000; // 45 seconds for RAG + LLM response

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const supabase = getSupabaseServerClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, userId, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Get user profile for role-based context
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, department_id, department:departments(name)')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Call chat service with timeout
    const ragResponse = await fetch(`${CHAT_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId,
        user_role: userProfile?.role || 'worker',
        department_id: userProfile?.department_id,
        history: history?.slice(-10), // Last 10 messages for context
      }),
      signal: controller.signal,
    });

    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('Chat service error:', errorText);
      throw new Error(`Chat service failed: ${ragResponse.status}`);
    }

    const result = await ragResponse.json();

    return NextResponse.json({
      success: true,
      message: result.message,
      sources: result.sources || [],
      confidence: result.confidence || 1.0,
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Chat service timeout', details: 'Request exceeded 45 seconds' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}