// apps/web/app/(app)/smartclaim/onboarding/_lib/actions.ts
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

export async function completeOnboarding(
  userId: string,
  data: {
    full_name: string;
    department_id: string;
  }
) {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({
      full_name: data.full_name,
      department_id: data.department_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/smartclaim');
  revalidatePath('/smartclaim/dashboard');
}