'use client';

import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type Comment = {
  id: string;
  comment: string;
  created_at: string;
  author: {
    full_name: string;
    role: string;
  } | null;
};

export function TicketComments({ comments }: { comments: Comment[] }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {comment.author?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {comment.author?.full_name || 'Unknown User'}
              </p>
              <Badge variant="outline" className="text-xs">
                {comment.author?.role === 'department_manager' ? 'Manager' : 'Worker'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {comment.comment}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
