// apps/web/app/(app)/smartclaim/admin/_components/chat-assistant.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { ChatInterface } from '../../dashboard/_components/chat-interface';
import { BotIcon } from 'lucide-react';

interface ChatAssistantProps {
  userId: string;
}

export function ChatAssistant({ userId }: ChatAssistantProps) {
  return (
    <Card className="min-h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="h-5 w-5" />
          Admin Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 min-h-[500px]">
          <ChatInterface userId={userId} />
        </div>
      </CardContent>
    </Card>
  );
}