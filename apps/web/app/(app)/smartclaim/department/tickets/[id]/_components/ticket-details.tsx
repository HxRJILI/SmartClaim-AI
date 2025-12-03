'use client';

import { Badge } from '@kit/ui/badge';
import { Calendar, User, Building2, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Ticket = {
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
};

type Creator = {
  full_name: string;
  department_name: string | null;
} | null;

export function TicketDetails({ ticket, creator }: { ticket: Ticket; creator: Creator }) {
  return (
    <div className="bg-card p-6 rounded-lg border space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Submitted By</p>
              <p className="text-sm text-muted-foreground">
                {creator?.full_name || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">From Department</p>
              <p className="text-sm text-muted-foreground">
                {creator?.department_name || 'No department'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Category</p>
              <Badge variant="outline" className="mt-1">
                {ticket.category}
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Created</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Description</h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>
      </div>
    </div>
  );
}
