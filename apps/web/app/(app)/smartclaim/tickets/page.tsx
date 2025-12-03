// apps/web/app/(app)/smartclaim/tickets/page.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { TicketsTable } from './_components/tickets-table';
import { TicketFilters } from './_components/ticket-filters';
import { PageHeader } from './_components/page-header';

export const metadata = {
  title: 'My Tickets - SmartClaim',
  description: 'View and manage your tickets',
};

interface SearchParams {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
}

async function getTickets(userId: string, filters: SearchParams) {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('tickets')
    .select(`
      *,
      department:departments(id, name),
      attachments:ticket_attachments(count)
    `)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    const statuses = filters.status.split(',');
    query = query.in('status', statuses as any);
  }

  if (filters.category) {
    const categories = filters.category.split(',');
    query = query.in('category', categories as any);
  }

  if (filters.priority) {
    const priorities = filters.priority.split(',');
    query = query.in('priority', priorities as any);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data: tickets, error } = await query;

  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }

  return tickets;
}

async function getDepartments() {
  const supabase = getSupabaseServerClient();
  
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .order('name');

  return departments || [];
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Await searchParams in Next.js 15
  const filters = await searchParams;

  const [tickets, departments] = await Promise.all([
    getTickets(user.id, filters),
    getDepartments(),
  ]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader />
      
      <TicketFilters departments={departments} />
      
      <TicketsTable tickets={tickets} />
    </div>
  );
}