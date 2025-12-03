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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="h-5 w-5" />
          Admin Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChatInterface userId={userId} />
      </CardContent>
    </Card>
  );
}