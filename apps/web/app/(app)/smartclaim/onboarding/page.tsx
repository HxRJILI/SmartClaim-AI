// apps/web/app/(app)/smartclaim/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { OnboardingForm } from './_components/onboarding-form';

export const metadata = {
  title: 'Complete Your Profile - SmartClaim',
  description: 'Set up your SmartClaim profile',
};

async function checkOnboarding(userId: string) {
  const supabase = getSupabaseServerClient();
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, department_id, full_name')
    .eq('id', userId)
    .single();

  return profile;
}

export default async function OnboardingPage() {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const profile = await checkOnboarding(user.id);

  // Admins don't need onboarding - redirect them to dashboard
  if (profile?.role === 'admin') {
    redirect('/smartclaim/dashboard');
  }

  // If profile is complete, redirect to dashboard
  if (profile && profile.full_name && profile.department_id) {
    redirect('/smartclaim/dashboard');
  }

  // Get departments for selection
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, description')
    .order('name');

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to SmartClaim</h1>
          <p className="text-muted-foreground mt-2">
            Let's complete your profile to get started
          </p>
        </div>
        
        <OnboardingForm 
          userId={user.id} 
          email={user.email!}
          departments={departments?.map(d => ({ ...d, description: d.description || undefined })) || []} 
        />
      </div>
    </div>
  );
}