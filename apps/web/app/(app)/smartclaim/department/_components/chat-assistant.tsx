// apps/web/app/(app)/smartclaim/department/_components/chat-assistant.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { ChatInterface } from '../../dashboard/_components/chat-interface';

interface ChatAssistantProps {
  userId: string;
  departmentId: string;
}

export function ChatAssistant({ userId, departmentId }: ChatAssistantProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <ChatInterface userId={userId} />
      </CardContent>
    </Card>
  );
}