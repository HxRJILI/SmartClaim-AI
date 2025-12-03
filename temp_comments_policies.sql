-- RLS Policies for ticket_comments
DROP POLICY IF EXISTS "Users can view ticket comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can create ticket comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.ticket_comments;

CREATE POLICY "Users can view ticket comments"
  ON public.ticket_comments
  FOR SELECT
  USING (
    EXISTS (
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

CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments
  FOR DELETE
  USING (user_id = auth.uid());
