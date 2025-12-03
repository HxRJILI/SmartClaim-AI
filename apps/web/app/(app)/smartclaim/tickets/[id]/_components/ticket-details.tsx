// apps/web/app/(app)/smartclaim/tickets/[id]/_components/ticket-details.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import {
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  AlertCircleIcon,
  TagIcon,
} from 'lucide-react';
import { format } from 'date-fns';

interface TicketDetailsProps {
  ticket: any;
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {ticket.ai_summary && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-blue-600">AI Summary</span>
              {ticket.ai_confidence_score && (
                <Badge variant="outline" className="text-xs">
                  {(ticket.ai_confidence_score * 100).toFixed(0)}% confidence
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {ticket.ai_summary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <TagIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium capitalize">{ticket.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AlertCircleIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="font-medium capitalize">{ticket.priority}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ticket.creator?.avatar_url} />
                  <AvatarFallback>
                    {ticket.creator?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium">{ticket.creator?.full_name || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">
                {format(new Date(ticket.created_at), 'PPP')}
              </p>
            </div>
          </div>

          {ticket.department && (
            <div className="flex items-center gap-3">
              <BuildingIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{ticket.department.name}</p>
              </div>
            </div>
          )}

          {ticket.assigned_user && (
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={ticket.assigned_user?.avatar_url} />
                    <AvatarFallback>
                      {ticket.assigned_user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{ticket.assigned_user?.full_name}</p>
                </div>
              </div>
            </div>
          )}

          {ticket.sla_deadline && (
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">SLA Deadline</p>
                <p className="font-medium">
                  {format(new Date(ticket.sla_deadline), 'PPP')}
                </p>
              </div>
            </div>
          )}

          {ticket.resolved_at && (
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Resolved At</p>
                <p className="font-medium">
                  {format(new Date(ticket.resolved_at), 'PPP')}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}