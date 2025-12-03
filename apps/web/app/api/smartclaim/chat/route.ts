// apps/web/app/api/smartclaim/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
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

    // Call chat service
    const ragResponse = await fetch('http://localhost:8002/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId, // Changed from userId to user_id
        user_role: userProfile?.role || 'worker',
        department_id: userProfile?.department_id,
        history: history?.slice(-10), // Last 10 messages for context
      }),
    });

    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('Chat service error:', errorText);
      throw new Error(`Chat service failed: ${errorText}`);
    }

    const result = await ragResponse.json();

    // Note: chat_sessions table save removed - implement if needed
    // Optionally save chat history to database later

    return NextResponse.json({
      success: true,
      message: result.message,
      sources: result.sources || [],
      confidence: result.confidence || 1.0,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}