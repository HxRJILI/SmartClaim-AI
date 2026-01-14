// @ts-nocheck
// Ticket Detail Page for Workers
import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '~/lib/database.types';
import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { TicketComments } from './_components/ticket-comments';
import { CommentForm } from './_components/comment-form';
import { formatDistanceToNow } from 'date-fns';
import { TipsDisplayWrapper } from './_components/tips-display-wrapper';

export const metadata = {
  title: 'Ticket Details - SmartClaim',
  description: 'View ticket details',
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

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default async function WorkerTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await getSmartClaimSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Get ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', params.id)
    .eq('created_by', user.id) // Only show tickets created by this user
    .single();

  if (!ticket) {
    notFound();
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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href="/smartclaim/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{ticket.ticket_number}</h1>
            <Badge variant="outline" className={statusColors[ticket.status]}>
              {ticket.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={priorityColors[ticket.priority]}>
              {ticket.priority}
            </Badge>
          </div>
          <h2 className="text-xl text-muted-foreground">{ticket.title}</h2>
        </div>

        {/* Safety Tips for High Priority Tickets */}
        {['high', 'critical'].includes(ticket.priority) && (
          <TipsDisplayWrapper 
            ticketId={ticket.id}
            priority={ticket.priority}
            category={ticket.category}
            title={ticket.title}
            description={ticket.description}
          />
        )}

        {/* Ticket Details */}
        <div className="bg-card p-6 rounded-lg border space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          <div className="flex items-center gap-6 pt-4 border-t text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Category:</span>{' '}
              <Badge variant="outline" className="ml-1">{ticket.category}</Badge>
            </div>
            <div>
              <span className="font-medium">Created:</span>{' '}
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Comments & Updates</h3>
          <TicketComments comments={comments} />
          <div className="mt-6">
            <CommentForm ticketId={ticket.id} userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
