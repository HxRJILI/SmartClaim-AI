// apps/web/app/api/smartclaim/chat-sessions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// GET - Get a specific chat session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching chat session:', error);
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Get chat session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a chat session (add messages, update title, archive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, title, is_archived } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (messages !== undefined) {
      updateData.session_data = { messages };
      updateData.message_count = messages.length;
      
      // Update preview with last user message
      const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
      if (lastUserMessage) {
        updateData.preview = lastUserMessage.content.substring(0, 100);
      }

      // Auto-generate title from first user message if title is still default
      if (messages.length > 0) {
        const firstUserMessage = messages.find((m: { role: string }) => m.role === 'user');
        if (firstUserMessage) {
          // Get current session to check if title is default
          const { data: currentSession } = await supabase
            .from('chat_sessions')
            .select('title')
            .eq('id', id)
            .single();
          
          if (currentSession?.title === 'New Conversation') {
            // Generate title from first message (first 50 chars)
            updateData.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
          }
        }
      }
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (is_archived !== undefined) {
      updateData.is_archived = is_archived;
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat session:', error);
      return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Update chat session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a chat session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting chat session:', error);
      return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
