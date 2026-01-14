/**
 * RAG Query API Route
 * Queries the Multi-tenant RAG service with user context for proper access control
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8004';

export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Get user profile for role and department
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, department_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    // Map role to RAG service role format
    const roleMap: Record<string, string> = {
      'admin': 'admin',
      'department_manager': 'department_manager',
      'manager': 'department_manager',
      'worker': 'worker',
    };
    
    const userRole = roleMap[profile.role] || 'worker';
    
    // Call RAG service
    const ragResponse = await fetch(`${RAG_SERVICE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        user_context: {
          user_id: user.id,
          role: userRole,
          department_id: profile.department_id,
        },
        include_sources: true,
        rerank: true,
      }),
    });
    
    if (!ragResponse.ok) {
      const errorText = await ragResponse.text();
      console.error('RAG service error:', errorText);
      return NextResponse.json(
        { error: 'RAG service error', details: errorText },
        { status: ragResponse.status }
      );
    }
    
    const result = await ragResponse.json();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
