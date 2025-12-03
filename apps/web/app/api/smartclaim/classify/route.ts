// apps/web/app/api/smartclaim/classify/route.ts
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
    const { text, context } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Call classification service
    const classificationResponse = await fetch('http://localhost:8001/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        context,
        user_id: user.id,
      }),
    });

    if (!classificationResponse.ok) {
      throw new Error('Classification failed');
    }

    const result = await classificationResponse.json();

    // Expected result format:
    // {
    //   category: 'safety' | 'quality' | 'maintenance' | 'logistics' | 'hr' | 'other',
    //   priority: 'low' | 'medium' | 'high' | 'critical',
    //   summary: string,
    //   confidence: number,
    //   suggested_department: string,
    //   keywords: string[]
    // }

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify ticket' },
      { status: 500 }
    );
  }
}
