// apps/web/app/(app)/smartclaim/tickets/[id]/_lib/actions.ts
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function addComment(ticketId: string, userId: string, content: string) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('ticket_activities')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      activity_type: 'comment',
      content,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/smartclaim/tickets/${ticketId}`);
}