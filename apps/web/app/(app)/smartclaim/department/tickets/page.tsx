// @ts-nocheck
// Ticket Management Page for Department Managers
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';
import { TicketsTable } from './_components/tickets-table';
import { TicketFilters } from './_components/ticket-filters';
import { TicketsPageHeader } from './_components/page-header';

export const metadata = {
  title: 'Ticket Management - SmartClaim',
  description: 'Manage department tickets',
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
          } catch {}
        },
      },
    }
  );
}

export default async function TicketManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; priority?: string; search?: string }>;
}) {
  const supabase = await getSmartClaimSupabaseClient();
  const params = await searchParams;
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Get manager profile
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role, department_id')
    .eq('id', user.id)
    .single();

  if (!userProfile || userProfile.role !== 'department_manager') {
    redirect('/smartclaim/dashboard');
  }

  if (!userProfile.department_id) {
    redirect('/smartclaim/dashboard');
  }

  // Build query for tickets
  let query = supabase
    .from('tickets')
    .select('*')
    .eq('assigned_to_department', userProfile.department_id);

  // Apply filters
  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.category) {
    query = query.eq('category', params.category);
  }
  if (params.priority) {
    query = query.eq('priority', params.priority);
  }
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,ticket_number.ilike.%${params.search}%`);
  }

  const { data: tickets } = await query.order('created_at', { ascending: false });

  // Get creator info for each ticket
  const ticketsWithCreators = await Promise.all((tickets || []).map(async (ticket) => {
    const { data: creator } = await supabase
      .from('user_profiles')
      .select('id, full_name, department_id')
      .eq('id', ticket.created_by)
      .single();

    // Get creator's department if available
    let creatorDepartment = null;
    if (creator?.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', creator.department_id)
        .single();
      creatorDepartment = dept?.name;
    }

    return {
      ...ticket,
      creator: creator ? {
        ...creator,
        department_name: creatorDepartment
      } : null,
    };
  }));

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <TicketsPageHeader />

      <div className="space-y-6">
        <TicketFilters />
        <TicketsTable tickets={ticketsWithCreators} />
      </div>
    </div>
  );
}
