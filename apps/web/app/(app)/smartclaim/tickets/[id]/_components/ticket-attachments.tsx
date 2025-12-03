// apps/web/app/(app)/smartclaim/tickets/[id]/_components/ticket-attachments.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { FileIcon, DownloadIcon } from 'lucide-react';

interface TicketAttachmentsProps {
  attachments: any[];
}

function formatFileSize(bytes?: number) {
  if (!bytes) return 'Unknown size';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function TicketAttachments({ attachments }: TicketAttachmentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments ({attachments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.file_type} · {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              
              <Button asChild variant="ghost" size="sm">
                <a href={attachment.file_url} download target="_blank" rel="noopener noreferrer">
                  <DownloadIcon className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}