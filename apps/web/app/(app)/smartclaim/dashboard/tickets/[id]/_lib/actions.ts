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

    revalidatePath(`/smartclaim/dashboard/tickets/${ticketId}`);

    return { success: true };
  } catch (error) {
    console.error('Error in addTicketComment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
