// apps/web/app/(app)/smartclaim/tickets/[id]/_components/ticket-details.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Progress } from '@kit/ui/progress';
import {
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  AlertCircleIcon,
  TagIcon,
  ClockIcon,
  EyeIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ImageIcon,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, differenceInHours } from 'date-fns';

interface TicketDetailsProps {
  ticket: any;
}

// SLA Status component
function SLAStatus({ ticket }: { ticket: any }) {
  if (!ticket.sla_deadline) return null;
  
  const deadline = new Date(ticket.sla_deadline);
  const now = new Date();
  const isOverdue = isPast(deadline) && ticket.status !== 'closed' && ticket.status !== 'resolved';
  const hoursRemaining = differenceInHours(deadline, now);
  const createdAt = new Date(ticket.created_at);
  const totalHours = differenceInHours(deadline, createdAt);
  const elapsedHours = differenceInHours(now, createdAt);
  const progressPercent = Math.min(100, Math.max(0, (elapsedHours / totalHours) * 100));
  
  // Get SLA prediction data from original_content
  const slaPrediction = ticket.original_content?.sla_prediction;
  
  return (
    <div className={`p-4 rounded-lg border ${
      isOverdue 
        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
        : hoursRemaining < 4 
          ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
          : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ClockIcon className="h-4 w-4" />
          SLA Status
        </h3>
        <Badge variant={isOverdue ? 'destructive' : hoursRemaining < 4 ? 'secondary' : 'default'}>
          {isOverdue ? 'OVERDUE' : hoursRemaining < 4 ? 'AT RISK' : 'ON TRACK'}
        </Badge>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Deadline:</span>
          <span className="font-medium">{format(deadline, 'PPp')}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time Remaining:</span>
          <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
            {isOverdue ? 'Overdue by ' : ''}{formatDistanceToNow(deadline, { addSuffix: !isOverdue })}
          </span>
        </div>
        
        {!isOverdue && (
          <div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progressPercent.toFixed(0)}% of time elapsed
            </p>
          </div>
        )}
        
        {slaPrediction && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Breach Probability:</span>
              <span className={`font-medium ${
                slaPrediction.breach_probability > 0.7 ? 'text-red-600' :
                slaPrediction.breach_probability > 0.4 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(slaPrediction.breach_probability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Risk Level:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {slaPrediction.risk_level}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Visual Evidence component
function VisualEvidence({ ticket }: { ticket: any }) {
  const visualData = ticket.original_content;
  
  if (!visualData?.has_visual_evidence) return null;
  
  const lvmResults = visualData.lvm_analysis || [];
  
  return (
    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-purple-600" />
        <span className="text-purple-600">Visual Analysis</span>
        {visualData.visual_severity && (
          <Badge variant="outline" className={`text-xs ${
            visualData.visual_severity === 'critical' ? 'bg-red-100 text-red-700' :
            visualData.visual_severity === 'high' ? 'bg-orange-100 text-orange-700' :
            visualData.visual_severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            {visualData.visual_severity} severity
          </Badge>
        )}
      </h3>
      
      {lvmResults.map((lvm: any, idx: number) => (
        <div key={idx} className="space-y-2 text-sm">
          {lvm.visual_summary && (
            <p className="text-muted-foreground">{lvm.visual_summary}</p>
          )}
          
          {lvm.detected_objects && lvm.detected_objects.length > 0 && (
            <div>
              <span className="text-muted-foreground">Detected: </span>
              <span className="font-medium">{lvm.detected_objects.join(', ')}</span>
            </div>
          )}
          
          {lvm.issue_hypotheses && lvm.issue_hypotheses.length > 0 && (
            <div>
              <span className="text-muted-foreground">Possible Issues: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {lvm.issue_hypotheses.slice(0, 3).map((h: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {h.issue_type}: {(h.confidence * 100).toFixed(0)}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {lvm.requires_human_review && (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 mt-2">
              <EyeIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Human review recommended</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
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
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
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
            {ticket.original_content?.classification_keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ticket.original_content.classification_keywords.map((kw: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* SLA Status Section */}
        <SLAStatus ticket={ticket} />
        
        {/* Visual Evidence Section */}
        <VisualEvidence ticket={ticket} />

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