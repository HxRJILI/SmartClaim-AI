// apps/web/app/(app)/smartclaim/_components/chat-history-sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { ScrollArea } from '@kit/ui/scroll-area';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Archive,
  Clock,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ChatSession {
  id: string;
  title: string;
  preview: string | null;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatHistorySidebarProps {
  userId: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  onNewChat: () => void;
  sessions: ChatSession[];
  onDeleteSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatHistorySidebar({
  userId,
  currentSessionId,
  onSelectSession,
  onNewChat,
  sessions,
  onDeleteSession,
  onArchiveSession,
  isCollapsed = false,
  onToggleCollapse,
}: ChatHistorySidebarProps) {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // Filter out archived sessions for display
  const activeSessions = sessions.filter(s => !s.is_archived);
  const archivedSessions = sessions.filter(s => s.is_archived);

  // Group sessions by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedSessions = {
    today: activeSessions.filter(s => {
      const date = new Date(s.updated_at);
      return date.toDateString() === today.toDateString();
    }),
    yesterday: activeSessions.filter(s => {
      const date = new Date(s.updated_at);
      return date.toDateString() === yesterday.toDateString();
    }),
    lastWeek: activeSessions.filter(s => {
      const date = new Date(s.updated_at);
      return date > lastWeek && date.toDateString() !== today.toDateString() && date.toDateString() !== yesterday.toDateString();
    }),
    older: activeSessions.filter(s => {
      const date = new Date(s.updated_at);
      return date <= lastWeek;
    }),
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r bg-muted/30 flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground rotate-90 whitespace-nowrap">
          {activeSessions.length} chats
        </div>
      </div>
    );
  }

  const renderSessionItem = (session: ChatSession) => (
    <div
      key={session.id}
      className={cn(
        "group relative px-3 py-2 rounded-lg cursor-pointer transition-colors",
        currentSessionId === session.id
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted"
      )}
      onClick={() => onSelectSession(session.id)}
      onMouseEnter={() => setHoveredSession(session.id)}
      onMouseLeave={() => setHoveredSession(null)}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{session.title}</p>
          {session.preview && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {session.preview}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}</span>
            <span>·</span>
            <span>{session.message_count} messages</span>
          </div>
        </div>
      </div>

      {/* Action buttons on hover */}
      {hoveredSession === session.id && (
        <div className="absolute right-2 top-2 flex gap-1 bg-background/80 backdrop-blur-sm rounded p-1">
          {onArchiveSession && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onArchiveSession(session.id);
              }}
              title="Archive"
            >
              <Archive className="h-3 w-3" />
            </Button>
          )}
          {onDeleteSession && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderSessionGroup = (title: string, sessions: ChatSession[]) => {
    if (sessions.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          {title}
        </h4>
        <div className="space-y-1">
          {sessions.map(renderSessionItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Chat History</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNewChat}
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1 p-2">
        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <>
            {renderSessionGroup('Today', groupedSessions.today)}
            {renderSessionGroup('Yesterday', groupedSessions.yesterday)}
            {renderSessionGroup('Last 7 Days', groupedSessions.lastWeek)}
            {renderSessionGroup('Older', groupedSessions.older)}
          </>
        )}

        {/* Archived section */}
        {archivedSessions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <details className="group">
              <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2 cursor-pointer list-none flex items-center gap-2">
                <Archive className="h-3 w-3" />
                Archived ({archivedSessions.length})
              </summary>
              <div className="space-y-1 mt-2">
                {archivedSessions.map(renderSessionItem)}
              </div>
            </details>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
