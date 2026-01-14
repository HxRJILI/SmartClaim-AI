// apps/web/app/page.tsx - REPLACE ENTIRELY
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function RootPage() {
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/smartclaim/dashboard');
  } else {
    redirect('/auth/sign-in');
  }
}