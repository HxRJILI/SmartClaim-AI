// apps/web/app/(app)/smartclaim/tickets/[id]/_components/ticket-header.tsx
'use client';

import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface TicketHeaderProps {
  ticket: any;
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
};

export function TicketHeader({ ticket }: TicketHeaderProps) {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href="/smartclaim/tickets">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Tickets
        </Link>
      </Button>
      
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{ticket.title}</h1>
            <Badge className={`capitalize ${statusColors[ticket.status as keyof typeof statusColors]}`}>
              {ticket.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            {ticket.ticket_number}
          </p>
        </div>
      </div>
    </div>
  );
}