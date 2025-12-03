// apps/web/app/(app)/smartclaim/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { DashboardHeader } from './_components/dashboard-header';
import { StatsCards } from './_components/stats-cards';
import { TicketChart } from './_components/ticket-chart';
import { TicketSubmissionInterface } from './_components/ticket-submission-interface';

export const metadata = {
  title: 'SmartClaim Dashboard',
  description: 'Submit and track your claims and non-conformities',
};

async function getDashboardData(userId: string) {
  const supabase = getSupabaseServerClient();

  // Get user tickets stats
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('status, category, created_at, resolved_at')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tickets:', error);
    return null;
  }

  // Calculate stats
  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'new').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return { tickets, stats };
}

async function getUserProfile(userId: string) {
  const supabase = getSupabaseServerClient();
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, department:departments(*)')
    .eq('id', userId)
    .single();

  return profile;
}

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const [dashboardData, userProfile] = await Promise.all([
    getDashboardData(user.id),
    getUserProfile(user.id),
  ]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader user={user} profile={userProfile} />
      
      <StatsCards stats={dashboardData?.stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TicketChart tickets={dashboardData?.tickets || []} />
      </div>

      <TicketSubmissionInterface userId={user.id} />
    </div>
  );
}