// @ts-nocheck
// apps/web/app/(app)/smartclaim/department/page.tsx 
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';
import { DepartmentHeader } from './_components/department-header';
import { DepartmentStats } from './_components/department-stats';
import { PerformanceCharts } from './_components/performance-charts';
import { ChatAssistant } from './_components/chat-assistant';

export const metadata = {
  title: 'Department Dashboard - SmartClaim',
  description: 'Manage department tickets and performance',
};

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
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

async function getDepartmentData(departmentId: string) {
  const supabase = await getSmartClaimSupabaseClient();

  // Get department tickets
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('assigned_to_department', departmentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching department tickets:', error);
  }

  // Get user data for creators and assigned users separately
  const ticketsWithUsers = await Promise.all((tickets || []).map(async (ticket) => {
    const { data: creator } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', ticket.created_by)
      .single();

    let assignedUser = null;
    if (ticket.assigned_to_user) {
      const { data: assigned } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', ticket.assigned_to_user)
        .single();
      assignedUser = assigned;
    }

    return {
      ...ticket,
      creator,
      assigned_user: assignedUser,
    };
  }));

  // Calculate stats
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const stats = {
    total: ticketsWithUsers?.length || 0,
    new: ticketsWithUsers?.filter(t => t.status === 'new').length || 0,
    in_progress: ticketsWithUsers?.filter(t => t.status === 'in_progress').length || 0,
    pending_review: ticketsWithUsers?.filter(t => t.status === 'pending_review').length || 0,
    resolved: ticketsWithUsers?.filter(t => t.status === 'resolved').length || 0,
    today_new: ticketsWithUsers?.filter(t => new Date(t.created_at) >= today).length || 0,
  };

  // Calculate average resolution time
  const resolvedTickets = ticketsWithUsers?.filter(t => t.resolved_at) || [];
  let avgResolutionTime = 0;
  
  if (resolvedTickets.length > 0) {
    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.created_at).getTime();
      const resolved = new Date(ticket.resolved_at).getTime();
      return sum + (resolved - created);
    }, 0);
    avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
  }

  // Calculate SLA compliance
  const ticketsWithSLA = ticketsWithUsers?.filter(t => t.sla_deadline) || [];
  const slaCompliant = ticketsWithSLA.filter(t => {
    if (t.resolved_at) {
      return new Date(t.resolved_at) <= new Date(t.sla_deadline);
    }
    return new Date() <= new Date(t.sla_deadline);
  });
  const slaComplianceRate = ticketsWithSLA.length > 0 
    ? (slaCompliant.length / ticketsWithSLA.length) * 100 
    : 100;

  return {
    tickets: ticketsWithUsers || [],
    stats,
    avgResolutionTime,
    slaComplianceRate,
  };
}

async function getUserDepartment(userId: string) {
  const supabase = await getSmartClaimSupabaseClient();
  
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role, department_id, department:departments(*)')
    .eq('id', userId)
    .single();

  return userProfile;
}

export default async function DepartmentDashboardPage() {
  const supabase = await getSmartClaimSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const userProfile = await getUserDepartment(user.id);

  // Check if user has access to department dashboard
  if (!userProfile || (userProfile.role !== 'department_manager' && userProfile.role !== 'admin')) {
    redirect('/smartclaim/dashboard');
  }

  if (!userProfile.department_id) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">No Department Assigned</h2>
          <p className="text-muted-foreground mt-2">
            Please contact an administrator to assign you to a department.
          </p>
        </div>
      </div>
    );
  }

  const departmentData = await getDepartmentData(userProfile.department_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DepartmentHeader department={userProfile.department} />
      
      <DepartmentStats 
        stats={departmentData.stats}
        avgResolutionTime={departmentData.avgResolutionTime}
        slaComplianceRate={departmentData.slaComplianceRate}
      />
      
      <PerformanceCharts tickets={departmentData.tickets} />
      
      <ChatAssistant userId={user.id} departmentId={userProfile.department_id} />
    </div>
  );
}