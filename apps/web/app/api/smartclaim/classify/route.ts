// apps/web/app/api/smartclaim/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Service configuration
const CLASSIFIER_URL = process.env.CLASSIFIER_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

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
    const { text, context } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Call classification service with timeout
    const classificationResponse = await fetch(`${CLASSIFIER_URL}/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        context,
        user_id: user.id,
      }),
      signal: controller.signal,
    });

    if (!classificationResponse.ok) {
      const errorText = await classificationResponse.text();
      console.error('Classification service error:', errorText);
      throw new Error(`Classification failed: ${classificationResponse.status}`);
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
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Classification service timeout', details: 'Request exceeded 30 seconds' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to classify ticket', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
