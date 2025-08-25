-- Fix remaining RLS issues for tables that still need it enabled

-- Check and enable RLS on any remaining tables
DO $$
BEGIN
    -- Check if whatsapp_settings table exists and enable RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'whatsapp_settings') THEN
        ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
        
        -- Add policies for whatsapp_settings (admin only)
        CREATE POLICY "Only admins can access whatsapp_settings" ON public.whatsapp_settings
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    
    -- Check if producer_users table exists and enable RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'producer_users') THEN
        ALTER TABLE public.producer_users ENABLE ROW LEVEL SECURITY;
        
        -- Add policies for producer_users (admin only)
        CREATE POLICY "Only admins can access producer_users" ON public.producer_users
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    
    -- Check if ftp_settings table exists and enable RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ftp_settings') THEN
        ALTER TABLE public.ftp_settings ENABLE ROW LEVEL SECURITY;
        
        -- Add policies for ftp_settings (admin only)
        CREATE POLICY "Only admins can access ftp_settings" ON public.ftp_settings
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    
    -- Check if xml_settings table exists and enable RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'xml_settings') THEN
        ALTER TABLE public.xml_settings ENABLE ROW LEVEL SECURITY;
        
        -- Add policies for xml_settings (admin only)
        CREATE POLICY "Only admins can access xml_settings" ON public.xml_settings
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    
    -- Check if auth_tokens table exists and enable RLS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_tokens') THEN
        ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;
        
        -- Add policies for auth_tokens (admin only)
        CREATE POLICY "Only admins can access auth_tokens" ON public.auth_tokens
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
END $$;

-- Fix the search path issues for functions by adding SET search_path = 'public'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_worker_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
  IF table_name IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_updated_at_digital_employees()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.add_schedule_slots_columns()
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='schedule_slots' AND column_name='has_lineup') THEN
        ALTER TABLE public.schedule_slots
        ADD COLUMN has_lineup boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='schedule_slots' AND column_name='is_modified') THEN
        ALTER TABLE public.schedule_slots
        ADD COLUMN is_modified boolean DEFAULT false;
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.insert_show_items(items_array jsonb)
RETURNS SETOF show_items AS $$
BEGIN
  IF jsonb_typeof(items_array) != 'array' THEN
    RAISE EXCEPTION 'Input must be a JSON array';
  END IF;

  RETURN QUERY
  INSERT INTO show_items (
    show_id,
    position,
    name,
    title,
    details,
    phone,
    duration,
    is_break,
    is_note
  )
  SELECT
    (value->>'show_id')::uuid,
    (value->>'position')::integer,
    value->>'name',
    value->>'title',
    value->>'details',
    value->>'phone',
    (value->>'duration')::integer,
    (value->>'is_break')::boolean,
    (value->>'is_note')::boolean
  FROM jsonb_array_elements(items_array)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.add_slots_to_date_range(p_show_name text, p_host_name text, p_start_date date, p_end_date date, p_day_of_week integer, p_start_time time without time zone, p_end_time time without time zone, p_is_prerecorded boolean DEFAULT false, p_is_collection boolean DEFAULT false, p_color text DEFAULT 'green'::text)
RETURNS void AS $$
DECLARE
  curr_date DATE := p_start_date;
  dow INTEGER;
BEGIN
  WHILE curr_date <= p_end_date LOOP
    dow := EXTRACT(DOW FROM curr_date);
    -- If this date's day of week matches the specified day of week
    IF dow = p_day_of_week THEN
      INSERT INTO public.schedule_slots
        (show_name, host_name, date, start_time, end_time, is_prerecorded, is_collection, color)
      VALUES
        (p_show_name, p_host_name, curr_date, p_start_time, p_end_time, p_is_prerecorded, p_is_collection, p_color);
    END IF;
    curr_date := curr_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_digital_arrangement_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';