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

    // Create FormData with the file for the Python extractor service
    const extractorFormData = new FormData();
    extractorFormData.append('file', file);
    
    // Call Python extractor microservice
    const extractorResponse = await fetch('http://localhost:8000/extract', {
      method: 'POST',
      body: extractorFormData,
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