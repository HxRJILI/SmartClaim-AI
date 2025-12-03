// apps/web/app/(app)/smartclaim/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/smartclaim/dashboard');
  }

  return <>{children}</>;
}
