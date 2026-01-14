-- Fix ticket update policy to add WITH CHECK clause

DROP POLICY IF EXISTS "Department managers and admins can update tickets" ON public.tickets;

CREATE POLICY "Department managers and admins can update tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'admin'
        OR (
          user_profiles.role = 'department_manager'
          AND user_profiles.department_id = tickets.assigned_to_department
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND (
        user_profiles.role = 'admin'
        OR (
          user_profiles.role = 'department_manager'
          AND user_profiles.department_id = tickets.assigned_to_department
        )
      )
    )
  );
