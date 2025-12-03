// apps/web/app/(app)/smartclaim/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function SmartClaimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return <>{children}</>;
}