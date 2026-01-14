// @ts-nocheck
// apps/web/app/api/smartclaim/tips/route.ts
// Note: The safety_tips table needs to be created by running the migration
// After migration, regenerate types with: npx supabase gen types typescript --local > apps/web/lib/database.types.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:8002';

// POST - Generate safety tips for a high-priority ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticket_id, category, priority, description, title } = body;

    // Only generate tips for high and critical priority tickets
    if (!['high', 'critical'].includes(priority)) {
      return NextResponse.json({ 
        tips: null, 
        message: 'Tips are only generated for high and critical priority tickets' 
      });
    }

    // Check if tips already exist for this ticket
    const { data: existingTips } = await supabase
      .from('safety_tips')
      .select('*')
      .eq('ticket_id', ticket_id)
      .single();

    if (existingTips) {
      return NextResponse.json({ tips: existingTips });
    }

    // Generate tips using the chat service/LLM
    const prompt = `You are a workplace safety and incident response expert. A worker has submitted a ${priority} priority incident ticket with the following details:

Category: ${category}
Title: ${title || 'Not specified'}
Description: ${description || 'Not specified'}

Please provide immediate, actionable safety tips and advice to help the worker:
1. Stay safe while waiting for assistance
2. Take appropriate immediate actions
3. Document the situation properly
4. Protect themselves and others

Format your response as a clear, numbered list of actionable tips. Be concise but thorough. Focus on practical advice that can be implemented immediately.`;

    try {
      const chatResponse = await fetch(`${CHAT_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          message: prompt,
          history: [],
          context_type: 'safety_tips'
        }),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        console.error('Chat service error:', chatResponse.status, errorText);
        throw new Error(`Failed to generate tips from LLM: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      const generatedTips = chatData.response || chatData.message;

      // Store the generated tips
      const { data: savedTips, error: saveError } = await supabase
        .from('safety_tips')
        .insert({
          ticket_id,
          user_id: user.id,
          priority,
          category,
          tips_content: generatedTips,
          generated_by: 'llm',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving tips:', saveError);
        // Return the tips even if we couldn't save them
        return NextResponse.json({
          tips: {
            tips_content: generatedTips,
            priority,
            category,
          }
        });
      }

      return NextResponse.json({ tips: savedTips });
    } catch (llmError) {
      console.error('LLM error:', llmError);
      
      // Fallback to predefined tips if LLM fails
      const fallbackTips = generateFallbackTips(category, priority);
      
      return NextResponse.json({
        tips: {
          tips_content: fallbackTips,
          priority,
          category,
          generated_by: 'fallback',
        }
      });
    }
  } catch (error) {
    console.error('Tips generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Retrieve tips for a specific ticket
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticket_id');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    const { data: tips, error } = await supabase
      .from('safety_tips')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ tips: null });
    }

    return NextResponse.json({ tips });
  } catch (error) {
    console.error('Get tips error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fallback tips generator when LLM is unavailable
function generateFallbackTips(category: string, priority: string): string {
  const generalTips = `
## Immediate Safety Tips

Based on your ${priority} priority incident report, please follow these guidelines:

### 1. Ensure Your Safety First
- Move away from any immediate danger or hazardous conditions
- Do not attempt to handle dangerous situations alone
- Alert nearby colleagues if they may also be at risk

### 2. Document the Situation
- If safe to do so, take photos or videos of the incident
- Note the time, location, and any witnesses present
- Record any relevant details while they're fresh in your memory

### 3. Seek Appropriate Help
- Contact emergency services (911) if there's immediate danger to life
- Notify your immediate supervisor
- Contact facility security if applicable

### 4. Preserve Evidence
- Do not disturb the area if it's safe to leave it as is
- Keep any damaged equipment or materials if safe to do so
- Note any environmental conditions (lighting, weather, etc.)

### 5. Follow Up
- Seek medical attention if you feel unwell, even if symptoms seem minor
- Complete any required incident reports
- Cooperate with any investigations

A manager will review your ticket and provide specific guidance shortly.
`;

  const categorySpecificTips: Record<string, string> = {
    safety: `
### Category-Specific Safety Notes
- If this involves equipment malfunction, do not attempt to repair it yourself
- Ensure proper ventilation if any hazardous materials are involved
- Use appropriate PPE if you must remain in the area
`,
    workplace_incident: `
### Workplace Incident Notes
- Secure the area to prevent others from being affected
- If there's an injury, provide first aid only if trained to do so
- Do not move injured persons unless they're in immediate danger
`,
    equipment: `
### Equipment Safety Notes
- Power off or disconnect the equipment if safe to do so
- Place warning signs or barriers around malfunctioning equipment
- Do not attempt repairs without proper authorization
`,
    hazard: `
### Hazard Response Notes
- Evacuate the immediate area if necessary
- Report any spreading or worsening conditions immediately
- Follow your facility's emergency procedures
`,
  };

  return generalTips + (categorySpecificTips[category] || '');
}
