-- Add ticket_comments table for manager-worker communication
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster ticket comment queries
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON public.ticket_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_comments
-- Users can view comments on tickets they have access to
CREATE POLICY "Users can view ticket comments"
  ON public.ticket_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      LEFT JOIN public.user_profiles up ON up.id = auth.uid()
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.created_by = auth.uid() -- Creator can see
        OR t.assigned_to_user = auth.uid() -- Assigned user can see
        OR t.assigned_to_department = up.department_id -- Department members can see
        OR up.role = 'admin' -- Admins can see all
      )
    )
  );

-- Users can create comments on tickets they have access to
CREATE POLICY "Users can create ticket comments"
  ON public.ticket_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      LEFT JOIN public.user_profiles up ON up.id = auth.uid()
      WHERE t.id = ticket_comments.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to_user = auth.uid()
        OR t.assigned_to_department = up.department_id
        OR up.role = 'admin'
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_ticket_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ticket_comments_updated_at();
