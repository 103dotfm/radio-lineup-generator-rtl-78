-- Create helper function to check if user is admin (if not exists)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add policies for schedule_slots (main active table)
CREATE POLICY "Authenticated users can read schedule_slots" ON public.schedule_slots
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert schedule_slots" ON public.schedule_slots
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update schedule_slots" ON public.schedule_slots
FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Only admins can delete schedule_slots" ON public.schedule_slots
FOR DELETE TO authenticated USING (public.is_admin());