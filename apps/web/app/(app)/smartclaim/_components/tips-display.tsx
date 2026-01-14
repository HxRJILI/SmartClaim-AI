// apps/web/app/(app)/smartclaim/_components/tips-display.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  AlertTriangleIcon, 
  ShieldAlertIcon, 
  CheckCircleIcon, 
  XIcon,
  LightbulbIcon,
  RefreshCwIcon 
} from 'lucide-react';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@kit/ui/alert';
import { cn } from '@kit/ui/utils';

interface TipsDisplayProps {
  ticketId: string;
  priority: string;
  category: string;
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

interface SafetyTips {
  id?: string;
  ticket_id: string;
  tips_content: string;
  priority: string;
  category: string;
  is_acknowledged?: boolean;
  generated_by?: 'llm' | 'fallback';
}

export function TipsDisplay({
  ticketId,
  priority,
  category,
  title,
  description,
  onDismiss,
}: TipsDisplayProps) {
  const [tips, setTips] = useState<SafetyTips | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show for high and critical priority
  const shouldShow = ['high', 'critical'].includes(priority);

  useEffect(() => {
    if (!shouldShow) {
      setIsLoading(false);
      return;
    }

    fetchOrGenerateTips();
  }, [ticketId, priority, category, shouldShow]);

  const fetchOrGenerateTips = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First try to fetch existing tips
      const getResponse = await fetch(`/api/smartclaim/tips?ticket_id=${ticketId}`);
      
      if (getResponse.ok) {
        const data = await getResponse.json();
        if (data.tips) {
          setTips(data.tips);
          setIsAcknowledged(data.tips.is_acknowledged || false);
          setIsLoading(false);
          return;
        }
      }

      // If no existing tips, generate new ones
      const generateResponse = await fetch('/api/smartclaim/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          priority,
          category,
          title,
          description,
        }),
      });

      if (generateResponse.ok) {
        const data = await generateResponse.json();
        setTips(data.tips);
      } else {
        setError('Could not load safety tips');
      }
    } catch (err) {
      console.error('Tips fetch error:', err);
      setError('Failed to load safety tips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    setIsAcknowledged(true);
    // Could also update the database to mark as acknowledged
    // For now, we'll just update the local state
  };

  const handleRefresh = () => {
    fetchOrGenerateTips();
  };

  if (!shouldShow) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <RefreshCwIcon className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Generating safety tips for your {priority} priority incident...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Could not load tips</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!tips) {
    return null;
  }

  if (isMinimized) {
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          priority === 'critical' 
            ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" 
            : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
        )}
        onClick={() => setIsMinimized(false)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <LightbulbIcon className={cn(
              "h-4 w-4",
              priority === 'critical' ? "text-red-600" : "text-amber-600"
            )} />
            <span className="text-sm font-medium">
              Safety Tips Available - Click to expand
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden",
      priority === 'critical' 
        ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" 
        : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
    )}>
      {/* Priority Banner */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        priority === 'critical' ? "bg-red-500" : "bg-amber-500"
      )} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {priority === 'critical' ? (
              <ShieldAlertIcon className="h-5 w-5 text-red-600" />
            ) : (
              <AlertTriangleIcon className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <CardTitle className={cn(
                "text-lg",
                priority === 'critical' ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"
              )}>
                {priority === 'critical' ? '🚨 Critical Safety Alert' : '⚠️ Important Safety Tips'}
              </CardTitle>
              <CardDescription>
                Review these tips while waiting for manager response
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tips Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div 
            className="whitespace-pre-wrap text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: formatTipsContent(tips.tips_content) 
            }}
          />
        </div>

        {/* Acknowledgment */}
        {!isAcknowledged ? (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Please acknowledge that you've read these safety tips
            </p>
            <Button 
              onClick={handleAcknowledge}
              className={cn(
                priority === 'critical' 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              I Understand
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-4 border-t text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Tips acknowledged</span>
          </div>
        )}

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground">
          {tips.generated_by === 'fallback' 
            ? 'These are general safety guidelines. A manager will provide specific guidance soon.'
            : 'These tips were generated based on your incident details. A manager will review your ticket shortly.'}
        </p>
      </CardContent>
    </Card>
  );
}

// Helper function to format tips content (basic markdown-like formatting)
function formatTipsContent(content: string): string {
  return content
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold mt-4 mb-2 text-base">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold mt-4 mb-2 text-lg">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><span class="font-medium">$1.</span> $2</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// Export a simplified version for ticket submission confirmation
export function QuickTipsAlert({ 
  priority, 
  category 
}: { 
  priority: string; 
  category: string;
}) {
  if (!['high', 'critical'].includes(priority)) {
    return null;
  }

  return (
    <Alert className={cn(
      priority === 'critical' 
        ? "border-red-500 bg-red-50 dark:bg-red-950/30" 
        : "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
    )}>
      {priority === 'critical' ? (
        <ShieldAlertIcon className="h-4 w-4 text-red-600" />
      ) : (
        <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
      )}
      <AlertTitle className={cn(
        priority === 'critical' ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"
      )}>
        {priority === 'critical' ? 'Critical Priority Incident' : 'High Priority Incident'}
      </AlertTitle>
      <AlertDescription>
        Your ticket has been classified as {priority} priority. 
        Safety tips and guidance are being generated to help you while waiting for manager response.
        Please review them carefully.
      </AlertDescription>
    </Alert>
  );
}
