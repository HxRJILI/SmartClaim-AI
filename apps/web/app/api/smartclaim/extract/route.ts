// apps/web/app/api/smartclaim/extract/route.ts
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // TODO: Call your Python extractor.py script
    // This is a placeholder - you'll need to implement the actual API call
    // to your Python microservice
    
    // Example: Using a Python microservice endpoint
    const extractorResponse = await fetch('http://localhost:8000/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': file.name,
        'X-File-Type': file.type,
      },
      body: buffer,
    });

    if (!extractorResponse.ok) {
      throw new Error('File extraction failed');
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
    return NextResponse.json(
      { error: 'Failed to extract text from file' },
      { status: 500 }
    );
  }
}