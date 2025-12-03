// apps/web/app/(app)/smartclaim/dashboard/_components/ticket-submission-interface.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Switch } from '@kit/ui/switch';
import { Label } from '@kit/ui/label';
import { MicIcon, PaperclipIcon, SendIcon, BotIcon } from 'lucide-react';
import { ChatInterface } from './chat-interface';
import { FileUpload } from './file-upload';
import { VoiceRecorder } from './voice-recorder';
import { toast } from 'sonner';
import { createTicket } from '../_lib/actions';

interface TicketSubmissionInterfaceProps {
  userId: string;
}

export function TicketSubmissionInterface({ userId }: TicketSubmissionInterfaceProps) {
  const [assistantMode, setAssistantMode] = useState(false);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async () => {
    if (!description.trim() && files.length === 0 && !voiceBlob) {
      toast.error('Please provide a description, file, or voice recording');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('description', description);
      formData.append('userId', userId);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      if (voiceBlob) {
        formData.append('voice', voiceBlob, 'recording.webm');
      }

      await createTicket(formData);

      toast.success('Your ticket has been submitted successfully');

      // Reset form
      setDescription('');
      setFiles([]);
      setVoiceBlob(null);
    } catch (error) {
      toast.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Submit a Claim or Non-Conformity</CardTitle>
          <div className="flex items-center space-x-2">
            <BotIcon className="h-4 w-4" />
            <Label htmlFor="assistant-mode">AI Assistant</Label>
            <Switch
              id="assistant-mode"
              checked={assistantMode}
              onCheckedChange={setAssistantMode}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {assistantMode ? (
          <ChatInterface userId={userId} />
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder="Describe your issue or non-conformity..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />

            <div className="flex items-center gap-3">
              <FileUpload files={files} onChange={setFiles} />
              <VoiceRecorder onRecordingComplete={setVoiceBlob} />
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="ml-auto"
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>

            {files.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {files.length} file(s) attached
              </div>
            )}

            {voiceBlob && (
              <div className="text-sm text-muted-foreground">
                Voice recording attached
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}