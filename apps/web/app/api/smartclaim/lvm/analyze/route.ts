/**
 * LVM (Vision Language Model) API Route
 * 
 * Proxies requests to the Python LVM service for image analysis.
 * Returns structured visual evidence for the multimodal pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';

// LVM service URL from environment
const LVM_API_URL = process.env.LVM_API_URL || 'http://localhost:8005';

/**
 * Request body for image analysis
 */
interface AnalyzeRequest {
  image_url: string;
  metadata?: {
    source?: string;
    location?: string;
    department?: string;
    timestamp?: string;
    reported_issue?: string;
    ticket_id?: string;
    user_id?: string;
  };
}

/**
 * Issue hypothesis from LVM
 */
interface IssueHypothesis {
  issue_type: string;
  confidence: number;
}

/**
 * LVM analysis response
 */
interface AnalyzeResponse {
  visual_summary: string;
  detected_objects: string[];
  scene_type: string;
  potential_issue_detected: boolean;
  issue_hypotheses: IssueHypothesis[];
  visual_severity_hint: string;
  image_quality: string;
  requires_human_review: boolean;
  processing_time_ms: number;
  model_version: string;
  raw_confidence?: number;
  error?: string;
}

/**
 * POST /api/smartclaim/lvm/analyze
 * 
 * Analyze an image using the Vision Language Model
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    // Validate required fields
    if (!body.image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    // Forward request to LVM service
    const response = await fetch(`${LVM_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LVM service error:', errorText);
      
      return NextResponse.json(
        { 
          error: 'LVM analysis failed',
          details: errorText 
        },
        { status: response.status }
      );
    }

    const result: AnalyzeResponse = await response.json();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('LVM API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/smartclaim/lvm/analyze
 * 
 * Health check for LVM service
 */
export async function GET() {
  try {
    const response = await fetch(`${LVM_API_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: 'unhealthy', error: 'LVM service unavailable' },
        { status: 503 }
      );
    }

    const health = await response.json();
    return NextResponse.json(health);
    
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Cannot connect to LVM service' },
      { status: 503 }
    );
  }
}
