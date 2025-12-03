// apps/web/app/(app)/smartclaim/tickets/[id]/page.tsx
import { redirect, notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { TicketHeader } from './_components/ticket-header';
import { TicketDetails } from './_components/ticket-details';
import { TicketTimeline } from './_components/ticket-timeline';
import { TicketAttachments } from './_components/ticket-attachments';
import { AddComment } from './_components/add-comment';

async function getTicket(ticketId: string, userId: string) {
  const supabase = getSupabaseServerClient();

  // First get the ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    console.error('Error fetching ticket:', error);
    return null;
  }

  // Fetch related data
  const [
    { data: creator },
    { data: department },
    { data: assignedUser },
    { data: attachments },
    { data: activities }
  ] = await Promise.all([
    // Get creator
    supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, role')
      .eq('id', (ticket as any).created_by)
      .single(),
    
    // Get department
    (ticket as any).assigned_to_department
      ? supabase
          .from('departments')
          .select('id, name, description')
          .eq('id', (ticket as any).assigned_to_department)
          .single()
      : Promise.resolve({ data: null }),
    
    // Get assigned user
    (ticket as any).assigned_to_user
      ? supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .eq('id', (ticket as any).assigned_to_user)
          .single()
      : Promise.resolve({ data: null }),
    
    // Get attachments
    supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId),
    
    // Get activities with user info
    supabase
      .from('ticket_activities')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
  ]);

  // Get users for activities
  const activityUserIds = (activities as any)?.map((a: any) => a.user_id).filter(Boolean) || [];
  const { data: activityUsers } = activityUserIds.length > 0
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', activityUserIds)
    : { data: [] };

  // Attach related data to ticket
  (ticket as any).creator = creator;
  (ticket as any).department = department;
  (ticket as any).assigned_user = assignedUser;
  (ticket as any).attachments = attachments || [];
  (ticket as any).activities = ((activities as any) || []).map((activity: any) => ({
    ...activity,
    user: (activityUsers as any)?.find((u: any) => u.id === activity.user_id) || null
  }));

  // Check if user has access to this ticket
  const hasAccess = 
    ticket.created_by === userId ||
    ticket.assigned_to_user === userId;

  if (!hasAccess) {
    // Check if user is in the assigned department or is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, department_id')
      .eq('id', userId)
      .single();

    if (
      userProfile?.role !== 'admin' &&
      userProfile?.department_id !== ticket.assigned_to_department
    ) {
      return null;
    }
  }

  return ticket;
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = getSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Await params in Next.js 15
  const { id } = await params;

  const ticket = await getTicket(id, user.id);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <TicketHeader ticket={ticket} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TicketDetails ticket={ticket} />
          
          {ticket.attachments && ticket.attachments.length > 0 && (
            <TicketAttachments attachments={ticket.attachments} />
          )}
          
          <AddComment ticketId={ticket.id} userId={user.id} />
        </div>
        
        <div className="lg:col-span-1">
          <TicketTimeline activities={ticket.activities || []} />
        </div>
      </div>
    </div>
  );
}