'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';

async function getSmartClaimSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function updateTicketStatus(ticketId: string, status: string) {
  try {
    const supabase = await getSmartClaimSupabaseClient();

    // Set resolved_at if status is resolved
    const updateData: Record<string, any> = {
      status: status as 'new' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' | 'rejected',
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    } else if (status === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, error: error.message };
    }

    // Get current user and ticket info
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Add to ticket activities
      await supabase
        .from('ticket_activities')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          activity_type: 'status_change',
          description: `Status changed to ${status.replace('_', ' ')}`,
        });

      // Get ticket details for notification
      const { data: ticket } = await supabase
        .from('tickets')
        .select('created_by, ticket_number, title')
        .eq('id', ticketId)
        .single();

      // Get manager profile
      const { data: managerProfile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      // Notify the ticket creator (worker) about status change
      if (ticket && managerProfile && ticket.created_by !== user.id) {
        const statusMessages: Record<string, string> = {
          in_progress: 'Your ticket is now being worked on',
          pending_review: 'Your ticket is pending review',
          resolved: 'Your ticket has been resolved',
          closed: 'Your ticket has been closed',
        };

        const message = statusMessages[status] || `Your ticket status was updated to ${status.replace('_', ' ')}`;

        await supabase
          .from('notifications')
          .insert({
            user_id: ticket.created_by,
            ticket_id: ticketId,
            title: `Ticket #${ticket.ticket_number} - Status Update`,
            message: `${message}. Updated by ${managerProfile.full_name}.`,
            type: 'status_change',
            is_read: false,
          });
      }
    }

    revalidatePath('/smartclaim/department/tickets');
    revalidatePath(`/smartclaim/department/tickets/${ticketId}`);
    revalidatePath('/smartclaim/tickets');
    revalidatePath('/smartclaim/dashboard');

    // Sync ticket to RAG to update status info
    try {
      await fetch('http://localhost:8004/ingest/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
    } catch (ragError) {
      console.error('RAG sync failed (non-critical):', ragError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateTicketStatus:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}


export async function addTicketComment(
  ticketId: string,
  userId: string,
  comment: string
) {
  try {
    const supabase = await getSmartClaimSupabaseClient();

    const { error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        comment,
      });

    if (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }

    // Add to ticket activities
    await supabase
      .from('ticket_activities')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        activity_type: 'comment',
        description: 'Added a comment',
      });

    // Get ticket details to find the creator (worker)
    const { data: ticket } = await supabase
      .from('tickets')
      .select('created_by, ticket_number, title')
      .eq('id', ticketId)
      .single();

    // Get manager profile for notification
    const { data: managerProfile } = await supabase
      .from('user_profiles')
      .select('full_name, role')
      .eq('id', userId)
      .single();

    // Create notification for the ticket creator (worker) if this is a manager commenting
    if (ticket && managerProfile && managerProfile.role === 'department_manager' && ticket.created_by !== userId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: ticket.created_by,
          ticket_id: ticketId,
          title: `New message on Ticket #${ticket.ticket_number}`,
          message: `${managerProfile.full_name} commented: "${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}"`,
          type: 'comment',
          is_read: false,
        });
    }

    revalidatePath(`/smartclaim/department/tickets/${ticketId}`);
    revalidatePath('/smartclaim/dashboard');

    // Resync ticket to RAG to include new comment
    try {
      await fetch('http://localhost:8004/ingest/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
    } catch (ragError) {
      console.error('RAG sync failed (non-critical):', ragError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addTicketComment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

type Attachment = {
  name: string;
  url: string;
  size: number;
  type: string;
};

export async function saveResolutionReport(
  ticketId: string,
  report: string,
  attachments: Attachment[]
) {
  try {
    const supabase = await getSmartClaimSupabaseClient();

    // @ts-ignore - resolution_report is a new column
    const { error } = await supabase
      .from('tickets')
      .update({ 
        resolution_report: report,
        resolution_attachments: attachments,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', ticketId);

    if (error) {
      console.error('Error saving resolution report:', error);
      return { success: false, error: error.message };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Add to ticket activities
      await supabase
        .from('ticket_activities')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          activity_type: 'resolution_report',
          description: 'Updated resolution report',
        });

      // Get ticket details for notification
      const { data: ticket } = await supabase
        .from('tickets')
        .select('created_by, ticket_number, title')
        .eq('id', ticketId)
        .single();

      // Get manager profile
      const { data: managerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Notify the ticket creator (worker) about the resolution report
      if (ticket && managerProfile && ticket.created_by !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: ticket.created_by,
            ticket_id: ticketId,
            title: `Resolution Report for Ticket #${ticket.ticket_number}`,
            message: `${managerProfile.full_name} has added/updated the resolution report for your ticket.`,
            type: 'resolution_report',
            is_read: false,
          });
      }
    }

    revalidatePath(`/smartclaim/department/tickets/${ticketId}`);
    revalidatePath('/smartclaim/tickets');
    revalidatePath('/smartclaim/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Error in saveResolutionReport:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function uploadResolutionAttachment(formData: FormData) {
  try {
    const supabase = await getSmartClaimSupabaseClient();
    
    const file = formData.get('file') as File;
    const ticketId = formData.get('ticketId') as string;

    if (!file || !ticketId) {
      return { success: false, error: 'Missing file or ticket ID' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `resolution-reports/${ticketId}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    const attachment: Attachment = {
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
    };

    return { success: true, attachment };
  } catch (error) {
    console.error('Error in uploadResolutionAttachment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
