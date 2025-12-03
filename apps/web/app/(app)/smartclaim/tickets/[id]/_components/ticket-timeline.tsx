// apps/web/app/(app)/smartclaim/tickets/[id]/_components/ticket-timeline.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquareIcon,
  ArrowRightIcon,
  UserCheckIcon,
  CheckCircleIcon,
} from 'lucide-react';

interface TicketTimelineProps {
  activities: any[];
}

const activityIcons = {
  comment: MessageSquareIcon,
  status_change: ArrowRightIcon,
  assignment: UserCheckIcon,
  resolution: CheckCircleIcon,
};

export function TicketTimeline({ activities }: TicketTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          ) : (
            activities.map((activity, index) => {
              const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || MessageSquareIcon;
              
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar_url} />
                      <AvatarFallback>
                        {activity.user?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {index < activities.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1 pb-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {activity.user?.full_name || 'Unknown'}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {activity.content && (
                      <p className="text-sm text-muted-foreground">
                        {activity.content}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}