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

            <div className="flex flex-col gap-3">
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

              {voiceBlob && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium">Voice Recording Attached</span>
                    <span className="text-xs opacity-70">({Math.round(voiceBlob.size / 1024)} KB)</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVoiceBlob(null)}
                    className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                  >
                    <span className="sr-only">Remove recording</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}