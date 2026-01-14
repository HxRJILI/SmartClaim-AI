// apps/web/app/(app)/smartclaim/dashboard/_components/chat-interface.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Avatar, AvatarFallback } from '@kit/ui/avatar';
import { SendIcon, BotIcon, UserIcon, PlusIcon, PanelLeftIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ChatHistorySidebar, ChatSession } from '../../_components/chat-history-sidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  userId: string;
}

// Helper component to format time only on client side to avoid hydration mismatch
function MessageTime({ timestamp }: { timestamp: Date }) {
  const [formattedTime, setFormattedTime] = useState<string>('');

  useEffect(() => {
    setFormattedTime(
      timestamp.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    );
  }, [timestamp]);

  if (!formattedTime) return null;

  return (
    <p className="text-xs opacity-70 mt-1">
      {formattedTime}
    </p>
  );
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/smartclaim/chat-sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Initialize welcome message on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!isInitialized) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your SmartClaim assistant. I can help you with information about tickets, policies, and answer any questions you have. How can I assist you today?',
          timestamp: new Date(),
        },
      ]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages to current session
  const saveSessionMessages = useCallback(async (sessionId: string, newMessages: Message[]) => {
    try {
      await fetch(`/api/smartclaim/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
        }),
      });
      // Refresh sessions to update sidebar
      fetchSessions();
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [fetchSessions]);

  // Create new session
  const createNewSession = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/smartclaim/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_type: 'assistant',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        await fetchSessions();
        return data.session.id;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  };

  // Handle selecting a session from sidebar
  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    
    try {
      const response = await fetch(`/api/smartclaim/chat-sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const sessionMessages = data.session?.session_data?.messages || [];
        
        // Convert stored messages back to Message format
        const loadedMessages: Message[] = sessionMessages.map((m: { role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        }));
        
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        } else {
          // Reset to welcome message for empty sessions
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m your SmartClaim assistant. How can I assist you today?',
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load conversation');
    }
  };

  // Handle new conversation
  const handleNewConversation = async () => {
    const newSessionId = await createNewSession();
    if (newSessionId) {
      setCurrentSessionId(newSessionId);
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your SmartClaim assistant. How can I assist you today?',
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Handle archive session
  const handleArchiveSession = async (sessionId: string) => {
    try {
      await fetch(`/api/smartclaim/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      });
      fetchSessions();
      
      if (sessionId === currentSessionId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to archive session:', error);
      toast.error('Failed to archive conversation');
    }
  };

  // Handle delete session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/smartclaim/chat-sessions/${sessionId}`, {
        method: 'DELETE',
      });
      fetchSessions();
      
      if (sessionId === currentSessionId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Create or get current session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast.error('Failed to create conversation');
        return;
      }
      setCurrentSessionId(sessionId);
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Call chat API
      const response = await fetch('/api/smartclaim/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          userId: userId,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'I apologize, but I couldn\'t process your request. Please try again.',
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Save to session
      await saveSessionMessages(sessionId, finalMessages);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response from assistant');

      // Add a fallback message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[600px] gap-0">
      {/* Sidebar */}
      {showSidebar && (
        <ChatHistorySidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewConversation={handleNewConversation}
          onArchiveSession={handleArchiveSession}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoadingSessions}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-2 p-3 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            className="h-8 w-8"
          >
            <PanelLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewConversation}
            className="h-8 w-8"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium truncate flex-1">
            {currentSessionId 
              ? sessions.find(s => s.id === currentSessionId)?.title || 'New Conversation'
              : 'New Conversation'}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <BotIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <MessageTime timestamp={message.timestamp} />
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <BotIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-background border rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}