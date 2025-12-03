'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Label } from '@kit/ui/label';
import { addTicketComment } from '../_lib/actions';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

export function CommentForm({ ticketId, userId }: { ticketId: string; userId: string }) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addTicketComment(ticketId, userId, comment.trim());
      
      if (result.success) {
        toast.success('Comment added successfully');
        setComment('');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to add comment');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="comment">Add a comment</Label>
        <Textarea
          id="comment"
          placeholder="Ask for more information or provide updates..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          disabled={isSubmitting}
          className="resize-none"
        />
      </div>
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !comment.trim()}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Comment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
