// apps/web/app/(app)/smartclaim/admin/_components/system-configuration.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { Switch } from '@kit/ui/switch';
import { SettingsIcon } from 'lucide-react';

export function SystemConfiguration() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          System Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sla-hours">Default SLA Hours</Label>
            <Input 
              id="sla-hours" 
              type="number" 
              defaultValue="48" 
              placeholder="Hours"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-confidence">AI Classification Confidence Threshold</Label>
            <Input 
              id="ai-confidence" 
              type="number" 
              step="0.1"
              min="0"
              max="1"
              defaultValue="0.7" 
              placeholder="0.0 - 1.0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-assign">Auto-assign Tickets</Label>
              <p className="text-sm text-muted-foreground">
                Automatically assign tickets to departments
              </p>
            </div>
            <Switch id="auto-assign" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email alerts for ticket updates
              </p>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-summarization">AI Summarization</Label>
              <p className="text-sm text-muted-foreground">
                Generate AI summaries for tickets
              </p>
            </div>
            <Switch id="ai-summarization" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="voice-transcription">Voice Transcription</Label>
              <p className="text-sm text-muted-foreground">
                Enable ASR for voice recordings
              </p>
            </div>
            <Switch id="voice-transcription" defaultChecked />
          </div>
        </div>

        <Button className="w-full">
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}