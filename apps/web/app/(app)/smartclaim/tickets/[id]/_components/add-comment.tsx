// apps/web/app/(app)/smartclaim/tickets/[id]/_components/add-comment.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Textarea } from '@kit/ui/textarea';
import { Button } from '@kit/ui/button';
import { SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { addComment } from '../_lib/actions';

interface AddCommentProps {
  ticketId: string;
  userId: string;
}

export function AddComment({ ticketId, userId }: AddCommentProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);

    try {
      await addComment(ticketId, userId, comment);
      
      toast.success('Comment added successfully');
      
      setComment('');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Comment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Write your comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="resize-none"
        />
        
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <SendIcon className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </Button>
      </CardContent>
    </Card>
  );
}