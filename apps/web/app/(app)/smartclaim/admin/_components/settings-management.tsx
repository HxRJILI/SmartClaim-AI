// apps/web/app/(app)/smartclaim/admin/_components/settings-management.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Switch } from '@kit/ui/switch';
import { Separator } from '@kit/ui/separator';
import { Progress } from '@kit/ui/progress';
import {
  SettingsIcon,
  BrainIcon,
  ClockIcon,
  BellIcon,
  MicIcon,
  ImageIcon,
  DatabaseIcon,
  GaugeIcon,
  SaveIcon,
  RotateCcwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ServerIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'checking';
  version?: string;
}

interface SettingsManagementProps {
  initialSettings?: {
    default_sla_hours?: number;
    ai_confidence_threshold?: number;
    auto_assign_tickets?: boolean;
    email_notifications?: boolean;
    ai_summarization?: boolean;
    voice_transcription?: boolean;
    lvm_analysis?: boolean;
    rag_enabled?: boolean;
    predictive_sla?: boolean;
  };
}

export function SettingsManagement({ initialSettings }: SettingsManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [checkingServices, setCheckingServices] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    default_sla_hours: initialSettings?.default_sla_hours || 48,
    ai_confidence_threshold: initialSettings?.ai_confidence_threshold || 0.7,
    auto_assign_tickets: initialSettings?.auto_assign_tickets ?? true,
    email_notifications: initialSettings?.email_notifications ?? true,
    ai_summarization: initialSettings?.ai_summarization ?? true,
    voice_transcription: initialSettings?.voice_transcription ?? true,
    lvm_analysis: initialSettings?.lvm_analysis ?? true,
    rag_enabled: initialSettings?.rag_enabled ?? true,
    predictive_sla: initialSettings?.predictive_sla ?? true,
  });

  // Track original settings for comparison
  const [originalSettings] = useState(settings);

  // Check if settings have changed
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Check services health
  const checkServices = async () => {
    setCheckingServices(true);
    const services: ServiceStatus[] = [
      { name: 'Extractor', url: 'http://localhost:8000/health', status: 'checking' },
      { name: 'Classifier (LLM)', url: 'http://localhost:8001/health', status: 'checking' },
      { name: 'Chat', url: 'http://localhost:8002/health', status: 'checking' },
      { name: 'Transcriber (ASR)', url: 'http://localhost:8003/health', status: 'checking' },
      { name: 'RAG', url: 'http://localhost:8004/health', status: 'checking' },
      { name: 'LVM (Vision)', url: 'http://localhost:8005/health', status: 'checking' },
      { name: 'Aggregator', url: 'http://localhost:8006/health', status: 'checking' },
      { name: 'SLA Predictor', url: 'http://localhost:8007/health', status: 'checking' },
    ];

    setServiceStatuses(services);

    // Check each service
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(service.url, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          const data = await response.json();
          return {
            ...service,
            status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
            version: data.version,
          } as ServiceStatus;
        } catch {
          return { ...service, status: 'unhealthy' } as ServiceStatus;
        }
      })
    );

    setServiceStatuses(updatedServices);
    setCheckingServices(false);
  };

  // Check services on mount
  useEffect(() => {
    checkServices();
  }, []);

  const handleSaveSettings = async () => {
    startTransition(async () => {
      // In a real implementation, this would call an API
      // For now, we'll simulate saving
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Settings saved successfully');
      setHasChanges(false);
    });
  };

  const handleResetSettings = () => {
    setSettings({
      default_sla_hours: 48,
      ai_confidence_threshold: 0.7,
      auto_assign_tickets: true,
      email_notifications: true,
      ai_summarization: true,
      voice_transcription: true,
      lvm_analysis: true,
      rag_enabled: true,
      predictive_sla: true,
    });
  };

  const healthyCount = serviceStatuses.filter(s => s.status === 'healthy').length;
  const totalServices = serviceStatuses.length;

  return (
    <div className="space-y-6">
      {/* Service Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="h-5 w-5" />
                AI Services Status
              </CardTitle>
              <CardDescription>
                Monitor the health of connected AI microservices
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={checkServices}
              disabled={checkingServices}
            >
              <RotateCcwIcon className={`h-4 w-4 mr-2 ${checkingServices ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold">
              {healthyCount}/{totalServices}
            </div>
            <Badge className={healthyCount === totalServices ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {healthyCount === totalServices ? 'All Systems Operational' : 'Some Services Unavailable'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {serviceStatuses.map((service) => (
              <div 
                key={service.name}
                className={`p-3 rounded-lg border ${
                  service.status === 'healthy' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : service.status === 'checking'
                    ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {service.status === 'healthy' ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  ) : service.status === 'checking' ? (
                    <RotateCcwIcon className="h-4 w-4 text-gray-400 animate-spin" />
                  ) : (
                    <AlertCircleIcon className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                {service.version && (
                  <span className="text-xs text-muted-foreground ml-6">v{service.version}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA & Automation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              SLA & Automation
            </CardTitle>
            <CardDescription>
              Configure ticket processing and SLA defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sla-hours">Default SLA Hours</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="sla-hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.default_sla_hours}
                    onChange={(e) => setSettings({ ...settings, default_sla_hours: parseInt(e.target.value) || 48 })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default time allocated for ticket resolution
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-assign Tickets</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign tickets to departments based on AI classification
                  </p>
                </div>
                <Switch
                  checked={settings.auto_assign_tickets}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_assign_tickets: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Predictive SLA</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable AI-powered SLA predictions based on ticket content
                  </p>
                </div>
                <Switch
                  checked={settings.predictive_sla}
                  onCheckedChange={(checked) => setSettings({ ...settings, predictive_sla: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Features Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainIcon className="h-5 w-5" />
              AI Features
            </CardTitle>
            <CardDescription>
              Configure AI-powered capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>AI Confidence Threshold</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.ai_confidence_threshold * 100}
                    onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseInt(e.target.value) / 100 })}
                    className="flex-1"
                  />
                  <span className="w-16 text-right font-mono text-sm">
                    {(settings.ai_confidence_threshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={settings.ai_confidence_threshold * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence required for AI classification decisions
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-3">
                  <BrainIcon className="h-4 w-4 text-purple-500" />
                  <div>
                    <Label>AI Summarization</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate automatic ticket summaries
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.ai_summarization}
                  onCheckedChange={(checked) => setSettings({ ...settings, ai_summarization: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-3">
                  <DatabaseIcon className="h-4 w-4 text-blue-500" />
                  <div>
                    <Label>RAG Context</Label>
                    <p className="text-sm text-muted-foreground">
                      Use knowledge base for improved classification
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.rag_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, rag_enabled: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multimodal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Multimodal Processing
            </CardTitle>
            <CardDescription>
              Configure voice and image processing features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-3">
                <MicIcon className="h-4 w-4 text-green-500" />
                <div>
                  <Label>Voice Transcription (ASR)</Label>
                  <p className="text-sm text-muted-foreground">
                    Convert voice recordings to text
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.voice_transcription}
                onCheckedChange={(checked) => setSettings({ ...settings, voice_transcription: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-3">
                <ImageIcon className="h-4 w-4 text-orange-500" />
                <div>
                  <Label>Vision Analysis (LVM)</Label>
                  <p className="text-sm text-muted-foreground">
                    Analyze images for visual evidence
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.lvm_analysis}
                onCheckedChange={(checked) => setSettings({ ...settings, lvm_analysis: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure system notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email alerts for important events
                </p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
              />
            </div>

            <Separator />

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Notification Events</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• New ticket assigned to department</li>
                <li>• SLA breach warning (4 hours before deadline)</li>
                <li>• Ticket status changes</li>
                <li>• High-priority tickets created</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save/Reset Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleResetSettings}>
                <RotateCcwIcon className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSaveSettings} disabled={isPending || !hasChanges}>
                <SaveIcon className="h-4 w-4 mr-2" />
                {isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
