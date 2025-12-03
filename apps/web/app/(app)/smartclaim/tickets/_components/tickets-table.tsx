// apps/web/app/(app)/smartclaim/tickets/_components/tickets-table.tsx
'use client';

import { Card } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { EyeIcon, PaperclipIcon } from 'lucide-react';
import Link from 'next/link';
import { Ticket } from '@kit/smartclaim/types';
import { formatDistanceToNow } from 'date-fns';

interface TicketsTableProps {
  tickets: any[];
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pending_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export function TicketsTable({ tickets }: TicketsTableProps) {
  if (tickets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No tickets found</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-sm">
                {ticket.ticket_number}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {ticket.title}
                  {ticket.attachments && ticket.attachments[0]?.count > 0 && (
                    <PaperclipIcon className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {ticket.category}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`capitalize ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`capitalize ${statusColors[ticket.status as keyof typeof statusColors]}`}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {ticket.department ? (
                  <span className="text-sm">{ticket.department.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/smartclaim/tickets/${ticket.id}`}>
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}