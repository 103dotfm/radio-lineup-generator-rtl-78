-- Enable RLS on all tables that don't have it and add strict policies

-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots_todelete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows_todelete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_shift_custom_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_work_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_work_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_divisions ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Schedule slots policies (authenticated users can read, only admins can modify)
CREATE POLICY "Authenticated users can read schedule_slots" ON public.schedule_slots
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert schedule_slots" ON public.schedule_slots
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update schedule_slots" ON public.schedule_slots
FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Only admins can delete schedule_slots" ON public.schedule_slots
FOR DELETE TO authenticated USING (public.is_admin());

-- Show items policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read show_items" ON public.show_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert show_items" ON public.show_items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update show_items" ON public.show_items
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete show_items" ON public.show_items
FOR DELETE TO authenticated USING (true);

-- Shows policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read shows" ON public.shows
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert shows" ON public.shows
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update shows" ON public.shows
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete shows" ON public.shows
FOR DELETE TO authenticated USING (true);

-- System settings policies (read for authenticated, admin only for modify)
CREATE POLICY "Authenticated users can read system_settings" ON public.system_settings
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert system_settings" ON public.system_settings
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update system_settings" ON public.system_settings
FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Only admins can delete system_settings" ON public.system_settings
FOR DELETE TO authenticated USING (public.is_admin());

-- Email settings policies (admin only)
CREATE POLICY "Only admins can access email_settings" ON public.email_settings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Email recipients policies (admin only)
CREATE POLICY "Only admins can access email_recipients" ON public.email_recipients
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Show email logs policies (admin only)
CREATE POLICY "Only admins can access show_email_logs" ON public.show_email_logs
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Digital work arrangements policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read digital_work_arrangements" ON public.digital_work_arrangements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert digital_work_arrangements" ON public.digital_work_arrangements
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update digital_work_arrangements" ON public.digital_work_arrangements
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete digital_work_arrangements" ON public.digital_work_arrangements
FOR DELETE TO authenticated USING (true);

-- Digital shifts policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read digital_shifts" ON public.digital_shifts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert digital_shifts" ON public.digital_shifts
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update digital_shifts" ON public.digital_shifts
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete digital_shifts" ON public.digital_shifts
FOR DELETE TO authenticated USING (true);

-- Digital shift custom rows policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read digital_shift_custom_rows" ON public.digital_shift_custom_rows
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert digital_shift_custom_rows" ON public.digital_shift_custom_rows
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update digital_shift_custom_rows" ON public.digital_shift_custom_rows
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete digital_shift_custom_rows" ON public.digital_shift_custom_rows
FOR DELETE TO authenticated USING (true);

-- Divisions policies (authenticated users can read, admin can modify)
CREATE POLICY "Authenticated users can read divisions" ON public.divisions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert divisions" ON public.divisions
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update divisions" ON public.divisions
FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Only admins can delete divisions" ON public.divisions
FOR DELETE TO authenticated USING (public.is_admin());

-- Worker divisions policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read worker_divisions" ON public.worker_divisions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert worker_divisions" ON public.worker_divisions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update worker_divisions" ON public.worker_divisions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete worker_divisions" ON public.worker_divisions
FOR DELETE TO authenticated USING (true);

-- Producer work arrangements policies (authenticated users can manage)
CREATE POLICY "Authenticated users can read producer_work_arrangements" ON public.producer_work_arrangements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert producer_work_arrangements" ON public.producer_work_arrangements
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update producer_work_arrangements" ON public.producer_work_arrangements
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete producer_work_arrangements" ON public.producer_work_arrangements
FOR DELETE TO authenticated USING (true);

-- Backup tables policies (admin only access)
CREATE POLICY "Only admins can access schedule_slots_backup" ON public.schedule_slots_backup
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can access schedule_slots_todelete" ON public.schedule_slots_todelete
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can access shows_backup" ON public.shows_backup
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can access shows_todelete" ON public.shows_todelete
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());