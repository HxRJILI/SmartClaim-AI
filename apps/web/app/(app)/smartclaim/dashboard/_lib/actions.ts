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

      // Call file extraction API
      try {
        const extractionFormData = new FormData();
        extractionFormData.append('file', file);

        const extractionResponse = await fetch('http://localhost:8000/extract', {
          method: 'POST',
          body: extractionFormData,
        });

        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json();
          if (extractionData.success && extractionData.text) {
             extractedText += `\n\n--- Extracted content from ${file.name} ---\n${extractionData.text}`;
          }
        } else {
            console.error(`Failed to extract text from ${file.name}: ${extractionResponse.statusText}`);
        }
      } catch (error) {
        console.error(`Error calling extraction service for ${file.name}:`, error);
      }
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

      // Call ASR API
      try {
        const transcriptionFormData = new FormData();
        transcriptionFormData.append('file', voice, 'recording.webm');

        const transcriptionResponse = await fetch('http://localhost:8003/transcribe', {
          method: 'POST',
          body: transcriptionFormData,
        });

        if (transcriptionResponse.ok) {
          const transcriptionData = await transcriptionResponse.json();
          if (transcriptionData.text) {
             extractedText += `\n\n--- Transcribed Voice Recording ---\n${transcriptionData.text}`;
          }
        } else {
            console.error(`Failed to transcribe voice: ${transcriptionResponse.statusText}`);
        }
      } catch (error) {
        console.error('Error calling transcription service:', error);
      }
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
        // Try exact match first
        let { data: dept } = await supabase
          .from('departments')
          .select('id')
          .eq('name', classification.suggested_department)
          .limit(1)
          .single();
        
        // If no exact match, try partial match
        if (!dept) {
          const result = await supabase
            .from('departments')
            .select('id')
            .ilike('name', `%${classification.suggested_department}%`)
            .limit(1)
            .single();
          dept = result.data;
        }
        
        // If still no match, try matching based on category
        if (!dept && category) {
          const categoryToDept: Record<string, string> = {
            'safety': 'Safety',
            'quality': 'Quality',
            'maintenance': 'Maintenance',
            'logistics': 'Logistics',
            'hr': 'Human',
          };
          const deptPartialName = categoryToDept[category];
          if (deptPartialName) {
            const result = await supabase
              .from('departments')
              .select('id')
              .ilike('name', `%${deptPartialName}%`)
              .limit(1)
              .single();
            dept = result.data;
          }
        }
        
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

  // Notify department managers about the new ticket
  if (suggestedDepartment) {
    // Get all managers in the assigned department
    const { data: departmentManagers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('department_id', suggestedDepartment)
      .eq('role', 'department_manager');

    // Get worker's name for the notification
    const { data: workerProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const workerName = workerProfile?.full_name || 'A worker';

    // Create notifications for each manager
    if (departmentManagers && departmentManagers.length > 0) {
      const notifications = departmentManagers.map(manager => ({
        user_id: manager.id,
        ticket_id: ticket.id,
        title: `New Ticket Assigned: ${ticket.ticket_number}`,
        message: `${workerName} submitted a new ${priority} priority ${category} ticket: "${title.substring(0, 80)}${title.length > 80 ? '...' : ''}"`,
        type: 'new_ticket',
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }

  // Sync ticket to RAG service for semantic search
  try {
    await fetch('http://localhost:8004/ingest/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket.id }),
    });
    console.log(`Ticket ${ticket.id} synced to RAG`);
  } catch (ragError) {
    // Don't fail ticket creation if RAG sync fails
    console.error('RAG sync failed (non-critical):', ragError);
  }

  revalidatePath('/smartclaim/dashboard');
  revalidatePath('/smartclaim/tickets');
  revalidatePath('/smartclaim/department');
  revalidatePath('/smartclaim/department/tickets');

  return ticket;
}