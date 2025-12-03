// apps/web/app/api/smartclaim/transcribe/route.ts
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
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert audio to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // TODO: Call your ASR (Automatic Speech Recognition) service
    // This could be Whisper API, Google Speech-to-Text, etc.
    
    // Example: Using Whisper or custom ASR endpoint
    const asrResponse = await fetch('http://localhost:8000/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Audio-Format': audioFile.type,
      },
      body: buffer,
    });

    if (!asrResponse.ok) {
      throw new Error('Transcription failed');
    }

    const { text, language, confidence } = await asrResponse.json();

    return NextResponse.json({
      success: true,
      text,
      language,
      confidence,
      duration: audioFile.size, // Approximate
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}