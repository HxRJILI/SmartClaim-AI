// apps/web/app/(app)/smartclaim/department/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function DepartmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Check if user is department manager
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'department_manager') {
    redirect('/smartclaim/dashboard');
  }

  if (!profile.department_id) {
    redirect('/smartclaim/onboarding');
  }

  return <>{children}</>;
}
