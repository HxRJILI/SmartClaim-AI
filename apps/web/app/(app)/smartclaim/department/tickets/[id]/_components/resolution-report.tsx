'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Label } from '@kit/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { saveResolutionReport, uploadResolutionAttachment } from '../_lib/actions';
import { toast } from 'sonner';
import { Loader2, FileText, Upload, X, File, Download } from 'lucide-react';

type Attachment = {
  name: string;
  url: string;
  size: number;
  type: string;
};

export function ResolutionReport({
  ticketId,
  currentReport,
  currentAttachments,
  ticketStatus,
}: {
  ticketId: string;
  currentReport: string | null;
  currentAttachments: Attachment[] | null;
  ticketStatus: string;
}) {
  const [report, setReport] = useState(currentReport || '');
  const [attachments, setAttachments] = useState<Attachment[]>(currentAttachments || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const canEdit = ['in_progress', 'pending_review', 'resolved'].includes(ticketStatus);

  const handleSaveReport = async () => {
    if (!report.trim()) {
      toast.error('Please enter a resolution report');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveResolutionReport(ticketId, report.trim(), attachments);
      
      if (result.success) {
        toast.success('Resolution report saved successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save report');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticketId', ticketId);

      const result = await uploadResolutionAttachment(formData);
      
      if (result.success && result.attachment) {
        setAttachments(prev => [...prev, result.attachment!]);
        toast.success('File uploaded successfully');
      } else {
        toast.error(result.error || 'Failed to upload file');
      }
    } catch (error) {
      toast.error('An error occurred while uploading');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resolution Report
        </CardTitle>
        <CardDescription>
          Document how the issue was resolved. This will be visible to the worker who submitted the ticket.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Text */}
        <div className="space-y-2">
          <Label htmlFor="resolution-report">Report Details</Label>
          <Textarea
            id="resolution-report"
            placeholder="Describe the steps taken to resolve this issue, findings, and any follow-up actions needed..."
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={6}
            disabled={!canEdit || isSubmitting}
            className="resize-none"
          />
        </div>

        {/* File Upload */}
        {canEdit && (
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Max 10MB. Supported: PDF, DOC, XLS, PNG, JPG, TXT
              </span>
            </div>
          </div>
        )}

        {/* Attachments List */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files</Label>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {canEdit && (
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveReport}
              disabled={isSubmitting || !report.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Report'
              )}
            </Button>
          </div>
        )}

        {/* Read-only message */}
        {!canEdit && (
          <p className="text-sm text-muted-foreground italic">
            {ticketStatus === 'new' 
              ? 'Change status to "In Progress" to start writing the resolution report.'
              : 'This ticket is closed. The report cannot be modified.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
