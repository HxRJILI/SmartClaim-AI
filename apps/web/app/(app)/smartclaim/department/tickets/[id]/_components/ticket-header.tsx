'use client';

import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@kit/ui/badge';

type Ticket = {
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string;
};

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

export function TicketHeader({ ticket }: { ticket: Ticket }) {
  return (
    <div>
      <Link href="/smartclaim/department/tickets">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
      </Link>

      <div className="flex items-start justify-between">
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
      </div>
    </div>
  );
}
