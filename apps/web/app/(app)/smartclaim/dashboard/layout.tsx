// apps/web/app/(app)/smartclaim/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Check user role and redirect if not worker
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.full_name) {
    redirect('/smartclaim/onboarding');
  }

  // Redirect to role-specific dashboards
  if (profile.role === 'admin') {
    redirect('/smartclaim/admin');
  }

  if (profile.role === 'department_manager') {
    if (!profile.department_id) {
      redirect('/smartclaim/onboarding');
    }
    redirect('/smartclaim/department');
  }

  // Workers need department
  if (!profile.department_id) {
    redirect('/smartclaim/onboarding');
  }

  return <>{children}</>;
}
