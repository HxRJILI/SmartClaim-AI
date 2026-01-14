// apps/web/app/api/smartclaim/chat-sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// GET - List all chat sessions for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Chat sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, initialMessage } = body;

    const sessionData = {
      messages: initialMessage ? [{
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date().toISOString(),
      }] : [],
    };

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title || 'New Conversation',
        session_data: sessionData,
        message_count: initialMessage ? 1 : 0,
        preview: initialMessage ? initialMessage.substring(0, 100) : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Create chat session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
