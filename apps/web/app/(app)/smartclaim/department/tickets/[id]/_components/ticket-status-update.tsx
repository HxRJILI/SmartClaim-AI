'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { updateTicketStatus } from '../_lib/actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function TicketStatusUpdate({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleStatusUpdate = async () => {
    if (status === currentStatus) {
      toast.info('Status unchanged');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await updateTicketStatus(ticketId, status);
      
      if (result.success) {
        toast.success('Ticket status updated successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
        setStatus(currentStatus); // Reset to current status
      }
    } catch (error) {
      toast.error('An error occurred');
      setStatus(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Update Status</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status">Ticket Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleStatusUpdate} 
          disabled={isUpdating || status === currentStatus}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Status'
          )}
        </Button>
      </div>

      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-medium mb-2">Status Guide</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p><strong>New:</strong> Just submitted</p>
          <p><strong>In Progress:</strong> Being worked on</p>
          <p><strong>Pending Review:</strong> Awaiting verification</p>
          <p><strong>Resolved:</strong> Issue fixed</p>
          <p><strong>Closed:</strong> Completed</p>
        </div>
      </div>
    </div>
  );
}
