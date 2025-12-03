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

    const { error } = await supabase
      .from('tickets')
      .update({ 
        status: status as 'new' | 'in_progress' | 'pending_review' | 'resolved' | 'closed' | 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, error: error.message };
    }

    // Add to ticket activities
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('ticket_activities')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          activity_type: 'status_change',
          description: `Status changed to ${status}`,
        });
    }

    revalidatePath('/smartclaim/department/tickets');
    revalidatePath(`/smartclaim/department/tickets/${ticketId}`);

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

    return { success: true };
  } catch (error) {
    console.error('Error in addTicketComment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
