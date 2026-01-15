// @ts-nocheck
// apps/web/app/(app)/smartclaim/admin/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';
import { AdminHeader } from './_components/admin-header';
import { AdminTabs } from './_components/admin-tabs';

export const metadata = {
  title: 'Admin Dashboard - SmartClaim',
  description: 'System administration and analytics',
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

async function getGlobalData() {
  const supabase = await getSmartClaimSupabaseClient();

  // Get all tickets

  // Get all tickets
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError);
  }

  // Get departments for each ticket
  const ticketsWithDept = await Promise.all((tickets || []).map(async (ticket) => {
    let department = null;
    if (ticket.assigned_to_department) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', ticket.assigned_to_department)
        .single();
      department = dept;
    }

    const { data: creator } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', ticket.created_by)
      .single();

    return {
      ...ticket,
      department,
      creator,
    };
  }));

  // Get all departments
  const { data: departments, error: deptsError } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (deptsError) {
    console.error('Error fetching departments:', deptsError);
  }

  // Get managers for departments
  const departmentsWithManagers = await Promise.all((departments || []).map(async (dept) => {
    let manager = null;
    if (dept.manager_id) {
      const { data: mgr } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', dept.manager_id)
        .single();
      manager = mgr;
    }
    return {
      ...dept,
      manager,
    };
  }));

  // Get user statistics with full details
  const { data: users } = await supabase
    .from('user_profiles')
    .select(`
      *,
      department:departments(id, name)
    `)
    .order('created_at', { ascending: false });

  // Calculate global stats
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    total_tickets: ticketsWithDept?.length || 0,
    new_tickets: ticketsWithDept?.filter(t => t.status === 'new').length || 0,
    in_progress: ticketsWithDept?.filter(t => t.status === 'in_progress').length || 0,
    resolved: ticketsWithDept?.filter(t => t.status === 'resolved').length || 0,
    today_tickets: ticketsWithDept?.filter(t => new Date(t.created_at) >= today).length || 0,
    week_tickets: ticketsWithDept?.filter(t => new Date(t.created_at) >= thisWeek).length || 0,
    month_tickets: ticketsWithDept?.filter(t => new Date(t.created_at) >= thisMonth).length || 0,
    total_users: users?.length || 0,
    total_departments: departmentsWithManagers?.length || 0,
  };

  // Calculate resolution metrics
  const resolvedTickets = ticketsWithDept?.filter(t => t.resolved_at) || [];
  let avgResolutionTime = 0;
  
  if (resolvedTickets.length > 0) {
    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.created_at).getTime();
      const resolved = new Date(ticket.resolved_at).getTime();
      return sum + (resolved - created);
    }, 0);
    avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Hours
  }

  // Department performance with user count
  const departmentPerformance = departmentsWithManagers?.map(dept => {
    const deptTickets = ticketsWithDept?.filter(t => t.assigned_to_department === dept.id) || [];
    const deptResolved = deptTickets.filter(t => t.resolved_at);
    const deptUsers = users?.filter(u => u.department_id === dept.id) || [];
    
    let deptAvgTime = 0;
    if (deptResolved.length > 0) {
      const totalTime = deptResolved.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const resolved = new Date(ticket.resolved_at).getTime();
        return sum + (resolved - created);
      }, 0);
      deptAvgTime = totalTime / deptResolved.length / (1000 * 60 * 60);
    }

    return {
      ...dept,
      total_tickets: deptTickets.length,
      new_tickets: deptTickets.filter(t => t.status === 'new').length,
      resolved_tickets: deptResolved.length,
      avg_resolution_time: deptAvgTime,
      resolution_rate: deptTickets.length > 0 
        ? (deptResolved.length / deptTickets.length) * 100 
        : 0,
      user_count: deptUsers.length,
      ticket_count: deptTickets.length,
    };
  }) || [];

  return {
    stats,
    tickets: ticketsWithDept || [],
    departments: departmentPerformance,
    users: users || [],
    avgResolutionTime,
  };
}

async function checkAdminAccess(userId: string) {
  const supabase = await getSmartClaimSupabaseClient();
  
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return userProfile?.role === 'admin';
}

export default async function AdminDashboardPage() {
  const supabase = await getSmartClaimSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const hasAccess = await checkAdminAccess(user.id);

  if (!hasAccess) {
    redirect('/smartclaim/dashboard');
  }

  const globalData = await getGlobalData();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AdminHeader />
      
      <AdminTabs
        stats={globalData.stats}
        avgResolutionTime={globalData.avgResolutionTime}
        tickets={globalData.tickets}
        departments={globalData.departments}
        users={globalData.users}
        userId={user.id}
      />
    </div>
  );
}