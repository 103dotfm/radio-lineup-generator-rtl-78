
-- Create WhatsApp settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_api_type TEXT NOT NULL DEFAULT 'twilio',
  whatsapp_group_id TEXT,
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  whatsapp_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create log table for WhatsApp messages
CREATE TABLE IF NOT EXISTS public.show_whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL REFERENCES public.shows_backup(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger to update the updated_at column
CREATE TRIGGER set_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies for WhatsApp tables
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can read whatsapp settings"
ON public.whatsapp_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert whatsapp settings"
ON public.whatsapp_settings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update whatsapp settings"
ON public.whatsapp_settings
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read whatsapp logs"
ON public.show_whatsapp_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert whatsapp logs"
ON public.show_whatsapp_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update whatsapp logs"
ON public.show_whatsapp_logs
FOR UPDATE
TO authenticated
USING (true);
