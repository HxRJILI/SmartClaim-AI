'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Eye, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  creator: {
    full_name: string;
    department_name: string | null;
  } | null;
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

export function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="bg-card p-12 rounded-lg border text-center">
        <p className="text-muted-foreground">No tickets found</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Submitted By</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-sm">
                {ticket.ticket_number}
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate">{ticket.title}</div>
              </TableCell>
              <TableCell>
                {ticket.creator?.full_name || 'Unknown'}
              </TableCell>
              <TableCell>
                {ticket.creator?.department_name ? (
                  <Badge variant="outline" className="font-normal">
                    {ticket.creator.department_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={statusColors[ticket.status] || ''}
                >
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline"
                  className={priorityColors[ticket.priority] || ''}
                >
                  {ticket.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/smartclaim/department/tickets/${ticket.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
