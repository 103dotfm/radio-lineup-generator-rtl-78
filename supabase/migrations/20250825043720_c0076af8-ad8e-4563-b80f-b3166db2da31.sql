-- Enable RLS on all remaining tables that have policies but RLS disabled
-- This will fix the linter errors about "Policy Exists RLS Disabled"

-- Enable RLS on tables that have policies but RLS disabled
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