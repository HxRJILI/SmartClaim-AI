// apps/web/app/(app)/smartclaim/department/_components/department-tickets-table.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
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
import { 
  EyeIcon, 
  UserCheckIcon,
  ArrowRightIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

interface DepartmentTicketsTableProps {
  tickets: any[];
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

// SLA Status Badge component
function SLABadge({ ticket }: { ticket: any }) {
  if (!ticket.sla_deadline) {
    return <Badge variant="outline" className="text-xs">No SLA</Badge>;
  }
  
  const deadline = new Date(ticket.sla_deadline);
  const now = new Date();
  const isOverdue = isPast(deadline) && ticket.status !== 'closed' && ticket.status !== 'resolved';
  const hoursRemaining = differenceInHours(deadline, now);
  
  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-green-100 text-green-800 text-xs">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Met
            </Badge>
          </TooltipTrigger>
          <TooltipContent>SLA deadline was met</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isOverdue) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-red-100 text-red-800 text-xs animate-pulse">
              <AlertTriangleIcon className="h-3 w-3 mr-1" />
              Overdue
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Overdue by {formatDistanceToNow(deadline)}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (hoursRemaining < 4) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              <ClockIcon className="h-3 w-3 mr-1" />
              {hoursRemaining}h left
            </Badge>
          </TooltipTrigger>
          <TooltipContent>At risk - {hoursRemaining} hours remaining</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className="bg-green-100 text-green-800 text-xs">
            <ClockIcon className="h-3 w-3 mr-1" />
            {hoursRemaining}h
          </Badge>
        </TooltipTrigger>
        <TooltipContent>On track - {hoursRemaining} hours remaining</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DepartmentTicketsTable({ tickets }: DepartmentTicketsTableProps) {
  // Show only unresolved tickets or latest 20
  const displayTickets = tickets
    .filter(t => t.status !== 'closed')
    .slice(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {displayTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active tickets
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTickets.map((ticket) => (
                <TableRow key={ticket.id} className={
                  ticket.sla_deadline && isPast(new Date(ticket.sla_deadline)) && 
                  ticket.status !== 'closed' && ticket.status !== 'resolved'
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : ''
                }>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-1">
                      {ticket.ticket_number}
                      {ticket.original_content?.has_visual_evidence && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <ImageIcon className="h-3 w-3 text-purple-500" />
                            </TooltipTrigger>
                            <TooltipContent>Has visual evidence</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ticket.title}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.creator?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {ticket.creator?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {ticket.creator?.full_name || 'Unknown'}
                      </span>
                    </div>
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
                  <TableCell>
                    <SLABadge ticket={ticket} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/smartclaim/tickets/${ticket.id}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!ticket.assigned_user && (
                        <Button variant="outline" size="sm">
                          <UserCheckIcon className="h-4 w-4 mr-2" />
                          Assign
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}