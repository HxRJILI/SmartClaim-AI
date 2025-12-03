// apps/web/app/(app)/smartclaim/dashboard/_lib/actions.ts
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function createTicket(formData: FormData) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  const description = formData.get('description') as string;
  const files = formData.getAll('files') as File[];
  const voice = formData.get('voice') as File | null;

  // Determine input type
  let inputType = 'text';
  if (voice && files.length > 0) {
    inputType = 'combined';
  } else if (voice) {
    inputType = 'voice';
  } else if (files.length > 0) {
    inputType = 'file';
  }

  // Process files and voice to extract text
  let extractedText = description;
  const attachments: any[] = [];

  // Upload files to storage
  for (const file of files) {
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket_attachments')
      .upload(fileName, file);

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage
        .from('ticket_attachments')
        .getPublicUrl(fileName);

      attachments.push({
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
      });

      // TODO: Call file extraction API
      // const extracted = await extractTextFromFile(file);
      // extractedText += '\n' + extracted;
    }
  }

  // Upload voice recording
  if (voice) {
    const fileName = `${user.id}/${Date.now()}-recording.webm`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket_attachments')
      .upload(fileName, voice);

    if (!uploadError && uploadData) {
      const { data: { publicUrl } } = supabase.storage
        .from('ticket_attachments')
        .getPublicUrl(fileName);

      attachments.push({
        file_name: 'voice-recording.webm',
        file_type: voice.type,
        file_size: voice.size,
        file_url: publicUrl,
      });

      // TODO: Call ASR API
      // const transcribed = await transcribeAudio(voice);
      // extractedText += '\n' + transcribed;
    }
  }

  // Call classification API
  let category = 'other';
  let priority = 'medium';
  let title = extractedText.slice(0, 100);
  let suggestedDepartment = null;
  
  try {
    const classificationResponse = await fetch('http://localhost:8001/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: extractedText,
        user_id: user.id,
      }),
    });

    if (classificationResponse.ok) {
      const classification = await classificationResponse.json();
      category = classification.category || 'other';
      priority = classification.priority || 'medium';
      title = classification.summary || extractedText.slice(0, 100);
      
      // Map suggested department to department ID
      if (classification.suggested_department) {
        const { data: dept } = await supabase
          .from('departments')
          .select('id')
          .ilike('name', `%${classification.suggested_department}%`)
          .limit(1)
          .single();
        
        if (dept) {
          suggestedDepartment = dept.id;
        }
      }
    }
  } catch (error) {
    console.error('Classification failed, using defaults:', error);
  }

  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert({
      title,
      description: extractedText,
      category,
      priority,
      status: 'new',
      created_by: user.id,
      assigned_to_department: suggestedDepartment,
      input_type: inputType,
      original_content: {
        description,
        has_files: files.length > 0,
        has_voice: !!voice,
      },
    })
    .select()
    .single();

  if (ticketError) {
    throw new Error(ticketError.message);
  }

  // Create attachments
  if (attachments.length > 0) {
    await supabase.from('ticket_attachments').insert(
      attachments.map(att => ({
        ...att,
        ticket_id: ticket.id,
      }))
    );
  }

  // Create initial activity
  await supabase.from('ticket_activities').insert({
    ticket_id: ticket.id,
    user_id: user.id,
    activity_type: 'comment',
    content: 'Ticket created',
  });

  revalidatePath('/smartclaim/dashboard');
  revalidatePath('/smartclaim/tickets');

  return ticket;
}