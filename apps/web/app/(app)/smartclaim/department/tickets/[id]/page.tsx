// @ts-nocheck
// Ticket Detail Page for Department Managers
import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';
import { TicketHeader } from './_components/ticket-header';
import { TicketDetails } from './_components/ticket-details';
import { TicketStatusUpdate } from './_components/ticket-status-update';
import { TicketComments } from './_components/ticket-comments';
import { CommentForm } from './_components/comment-form';
import { ResolutionReport } from './_components/resolution-report';

export const metadata = {
  title: 'Ticket Details - SmartClaim',
  description: 'View and manage ticket',
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

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getSmartClaimSupabaseClient();
  
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

  // Get ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!ticket) {
    notFound();
  }

  // Verify manager has access to this ticket
  if (ticket.assigned_to_department !== userProfile.department_id) {
    redirect('/smartclaim/department/tickets');
  }

  // Get ticket creator
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('id, full_name, department_id')
    .eq('id', ticket.created_by)
    .single();

  // Get creator's department
  let creatorDepartment = null;
  if (creator?.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', creator.department_id)
      .single();
    creatorDepartment = dept?.name;
  }

  // Get comments
  const { data: rawComments } = await supabase
    .from('ticket_comments')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true });

  // Get comment authors
  const comments = await Promise.all((rawComments || []).map(async (comment) => {
    const { data: author } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', comment.user_id)
      .single();

    return {
      ...comment,
      author,
    };
  }));

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <TicketHeader ticket={ticket} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <TicketDetails 
            ticket={ticket} 
            creator={{
              ...creator,
              department_name: creatorDepartment
            }}
          />
          
          {/* Resolution Report Section */}
          <ResolutionReport
            ticketId={ticket.id}
            currentReport={ticket.resolution_report}
            currentAttachments={ticket.resolution_attachments}
            ticketStatus={ticket.status}
          />
          
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4">Comments & Communication</h2>
            <TicketComments comments={comments} />
            <div className="mt-6">
              <CommentForm ticketId={ticket.id} userId={user.id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <TicketStatusUpdate 
            ticketId={ticket.id} 
            currentStatus={ticket.status}
          />
        </div>
      </div>
    </div>
  );
}
