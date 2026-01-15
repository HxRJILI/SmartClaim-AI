// apps/web/app/(app)/smartclaim/dashboard/_lib/actions.ts
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

// Service URLs - environment variables with fallbacks
const EXTRACTOR_URL = process.env.EXTRACTOR_URL || 'http://localhost:8000';
const CLASSIFIER_URL = process.env.CLASSIFIER_URL || 'http://localhost:8001';
const TRANSCRIBER_URL = process.env.TRANSCRIBER_URL || 'http://localhost:8003';
const RAG_URL = process.env.RAG_URL || 'http://localhost:8004';
const LVM_URL = process.env.LVM_URL || 'http://localhost:8005';
const SLA_URL = process.env.SLA_URL || 'http://localhost:8007';

// Helper function to check if file is an image
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

// Helper function to convert file to base64 data URI
async function fileToDataUri(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${file.type};base64,${base64}`;
}

// LVM Analysis result interface
interface LVMAnalysisResult {
  visual_summary: string;
  detected_objects: string[];
  scene_type: string;
  potential_issue_detected: boolean;
  issue_hypotheses: Array<{ issue_type: string; confidence: number }>;
  visual_severity_hint: string;
  image_quality: string;
  requires_human_review: boolean;
  processing_time_ms: number;
  error?: string;
}

// SLA Prediction result interface
interface SLAPredictionResult {
  predicted_resolution_hours: number;
  breach_probability: number;
  risk_level: string;
  explanation: string;
  confidence: number;
  sla_deadline?: string;
  factors: Array<{ name: string; impact: string; weight: number }>;
}

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
  
  // Store LVM analysis results for all images
  const lvmResults: LVMAnalysisResult[] = [];
  let hasVisualEvidence = false;
  let visualSeverity: string | null = null;
  let lvmRequiresReview = false;

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

      const attachmentData: any = {
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
      };

      // If it's an image, analyze with LVM
      if (isImageFile(file)) {
        try {
          const imageDataUri = await fileToDataUri(file);
          
          const lvmResponse = await fetch(`${LVM_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: imageDataUri,
              metadata: {
                source: 'ticket_upload',
                user_id: user.id,
                reported_issue: description,
              }
            }),
          });

          if (lvmResponse.ok) {
            const lvmData: LVMAnalysisResult = await lvmResponse.json();
            
            // Only process if no error
            if (!lvmData.error) {
              lvmResults.push(lvmData);
              hasVisualEvidence = true;
              
              // Track highest severity
              const severityOrder = ['low', 'medium', 'high', 'critical'];
              if (!visualSeverity || severityOrder.indexOf(lvmData.visual_severity_hint) > severityOrder.indexOf(visualSeverity)) {
                visualSeverity = lvmData.visual_severity_hint;
              }
              
              if (lvmData.requires_human_review) {
                lvmRequiresReview = true;
              }
              
              // Add LVM analysis to extracted text
              extractedText += `\n\n--- Visual Analysis from ${file.name} ---`;
              extractedText += `\nScene Type: ${lvmData.scene_type}`;
              extractedText += `\nVisual Summary: ${lvmData.visual_summary}`;
              extractedText += `\nDetected Objects: ${lvmData.detected_objects.join(', ')}`;
              extractedText += `\nPotential Issue Detected: ${lvmData.potential_issue_detected ? 'Yes' : 'No'}`;
              extractedText += `\nVisual Severity: ${lvmData.visual_severity_hint}`;
              
              if (lvmData.issue_hypotheses && lvmData.issue_hypotheses.length > 0) {
                extractedText += `\nIssue Hypotheses:`;
                for (const hyp of lvmData.issue_hypotheses.slice(0, 3)) {
                  extractedText += `\n  - ${hyp.issue_type}: ${(hyp.confidence * 100).toFixed(0)}% confidence`;
                }
              }
              
              // Store LVM result in attachment metadata
              attachmentData.lvm_analysis = lvmData;
            }
          } else {
            console.error(`LVM analysis failed for ${file.name}: ${lvmResponse.statusText}`);
          }
        } catch (error) {
          console.error(`Error calling LVM service for ${file.name}:`, error);
        }
      } else {
        // Not an image - call file extraction API
        try {
          const extractionFormData = new FormData();
          extractionFormData.append('file', file);

          const extractionResponse = await fetch(`${EXTRACTOR_URL}/extract`, {
            method: 'POST',
            body: extractionFormData,
          });

          if (extractionResponse.ok) {
            const extractionData = await extractionResponse.json();
            if (extractionData.success && extractionData.text) {
              extractedText += `\n\n--- Extracted content from ${file.name} ---\n${extractionData.text}`;
              attachmentData.extracted_text = extractionData.text;
            }
          } else {
            console.error(`Failed to extract text from ${file.name}: ${extractionResponse.statusText}`);
          }
        } catch (error) {
          console.error(`Error calling extraction service for ${file.name}:`, error);
        }
      }
      
      attachments.push(attachmentData);
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

        const transcriptionResponse = await fetch(`${TRANSCRIBER_URL}/transcribe`, {
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

  // Call classification API with RAG context enhancement
  let category = 'other';
  let priority = 'medium';
  let title = extractedText.slice(0, 100);
  let suggestedDepartment = null;
  let classificationConfidence = 0.5;
  let classificationKeywords: string[] = [];
  let classificationReasoning = '';
  
  // First, try to get RAG context to enhance classification
  let ragContext = '';
  try {
    const ragResponse = await fetch(`${RAG_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: extractedText.slice(0, 500),
        top_k: 3,
        user_id: user.id,
      }),
    });
    
    if (ragResponse.ok) {
      const ragData = await ragResponse.json();
      if (ragData.results && ragData.results.length > 0) {
        ragContext = '\n\n--- Relevant Context from Knowledge Base ---\n';
        for (const result of ragData.results) {
          ragContext += `\n- ${result.content?.slice(0, 200) || 'N/A'}...`;
        }
      }
    }
  } catch (error) {
    console.log('RAG context retrieval skipped (non-critical):', error);
  }
  
  // Combine text with RAG context for better classification
  const textForClassification = extractedText + ragContext;
  
  try {
    const classificationResponse = await fetch(`${CLASSIFIER_URL}/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textForClassification,
        user_id: user.id,
        has_visual_evidence: hasVisualEvidence,
        visual_severity: visualSeverity,
      }),
    });

    if (classificationResponse.ok) {
      const classification = await classificationResponse.json();
      category = classification.category || 'other';
      priority = classification.priority || 'medium';
      title = classification.summary || extractedText.slice(0, 100);
      classificationConfidence = classification.confidence || 0.5;
      classificationKeywords = classification.keywords || [];
      classificationReasoning = classification.reasoning || '';
      
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

  // Call SLA prediction service
  let slaPrediction: SLAPredictionResult | null = null;
  let slaDeadline: string | null = null;
  
  try {
    const slaResponse = await fetch(`${SLA_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        priority,
        description_length: extractedText.length,
        has_attachments: attachments.length > 0,
        has_visual_evidence: hasVisualEvidence,
        visual_severity: visualSeverity,
        source_count: (files.length > 0 ? 1 : 0) + (voice ? 1 : 0) + 1, // files + voice + text
        confidence_score: classificationConfidence,
        requires_human_review: lvmRequiresReview,
        keywords: classificationKeywords,
      }),
    });
    
    if (slaResponse.ok) {
      slaPrediction = await slaResponse.json();
      slaDeadline = slaPrediction?.sla_deadline || null;
      console.log('SLA prediction:', slaPrediction);
    }
  } catch (error) {
    console.error('SLA prediction failed (non-critical):', error);
  }

  // Create ticket with all AI insights
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
      sla_deadline: slaDeadline,
      ai_confidence_score: classificationConfidence,
      ai_summary: classificationReasoning || title,
      original_content: {
        description,
        has_files: files.length > 0,
        has_voice: !!voice,
        has_visual_evidence: hasVisualEvidence,
        visual_severity: visualSeverity,
        lvm_analysis: lvmResults.length > 0 ? lvmResults : null,
        sla_prediction: slaPrediction,
        classification_keywords: classificationKeywords,
        rag_context_used: ragContext.length > 0,
      },
    })
    .select()
    .single();

  if (ticketError) {
    throw new Error(ticketError.message);
  }

  // Create attachments with LVM analysis data
  if (attachments.length > 0) {
    await supabase.from('ticket_attachments').insert(
      attachments.map(att => {
        const { lvm_analysis, ...rest } = att;
        return {
          ...rest,
          ticket_id: ticket.id,
          // Store LVM analysis in extracted_text field for now
          extracted_text: lvm_analysis ? JSON.stringify(lvm_analysis) : att.extracted_text,
        };
      })
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
    await fetch(`${RAG_URL}/ingest/ticket`, {
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