// apps/web/app/api/smartclaim/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Service configuration
const EXTRACTOR_URL = process.env.EXTRACTOR_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds for file processing

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create FormData with the file for the Python extractor service
    const extractorFormData = new FormData();
    extractorFormData.append('file', file);
    
    // Call Python extractor microservice with timeout
    const extractorResponse = await fetch(`${EXTRACTOR_URL}/extract`, {
      method: 'POST',
      body: extractorFormData,
      signal: controller.signal,
    });

    if (!extractorResponse.ok) {
      const errorText = await extractorResponse.text();
      console.error('Extractor service error:', errorText);
      throw new Error(`File extraction failed: ${extractorResponse.status}`);
    }

    const { text, metadata } = await extractorResponse.json();

    return NextResponse.json({
      success: true,
      text,
      metadata,
      fileName: file.name,
      fileType: file.type,
    });

  } catch (error) {
    console.error('File extraction error:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'File extraction timeout', details: 'Request exceeded 60 seconds' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to extract text from file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}