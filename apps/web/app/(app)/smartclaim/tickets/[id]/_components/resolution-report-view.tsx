'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { FileText, Download, File, CheckCircle } from 'lucide-react';

type Attachment = {
  name: string;
  url: string;
  size: number;
  type: string;
};

export function ResolutionReportView({
  report,
  attachments,
  ticketStatus,
}: {
  report: string | null;
  attachments: Attachment[] | null;
  ticketStatus: string;
}) {
  // Only show if ticket is resolved/closed or if there's a report
  if (!report && !attachments?.length) {
    if (['resolved', 'closed'].includes(ticketStatus)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resolution Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground italic">
              The resolution report is pending. The department manager will provide details about how this issue was resolved.
            </p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={['resolved', 'closed'].includes(ticketStatus) ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {['resolved', 'closed'].includes(ticketStatus) ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          Resolution Report
        </CardTitle>
        <CardDescription>
          {['resolved', 'closed'].includes(ticketStatus) 
            ? 'This ticket has been resolved. Below are the details.'
            : 'The resolution report is in progress.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Text */}
        {report && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Resolution Details</h4>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{report}</p>
            </div>
          </div>
        )}

        {/* Attachments List */}
        {attachments && attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Attached Files</h4>
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
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
