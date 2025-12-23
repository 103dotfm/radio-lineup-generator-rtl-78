-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    exists_val BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
    ) INTO exists_val;
    
    RETURN exists_val;
END;
$$;

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  username TEXT,
  role TEXT DEFAULT 'user',
  is_admin BOOLEAN DEFAULT FALSE,
  title TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create initial admin user with password 'admin123'
INSERT INTO users (email, password_hash, full_name, role, is_admin)
VALUES ('admin@example.com', '$2b$10$3IxkPwz1GwUe9m5WFLhYpOxCxnMj6TyqGQtGZQwfFQLzuPqRNkJHe', 'Admin User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Table: profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  title TEXT,
  avatar_url TEXT,
  google_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: shows_backup
CREATE TABLE shows_backup (
  id UUID PRIMARY KEY,
  name TEXT,
  date DATE,
  time TEXT,
  slot_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);

-- Table: shows
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE,
  time TEXT,
  slot_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: show_items
CREATE TABLE show_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  details TEXT,
  phone TEXT,
  duration INTEGER,
  is_break BOOLEAN DEFAULT FALSE,
  is_note BOOLEAN DEFAULT FALSE,
  is_divider BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: interviewees
CREATE TABLE interviewees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  title TEXT,
  phone TEXT,
  duration INTEGER,
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: schedule_slots
CREATE TABLE schedule_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  show_name TEXT NOT NULL,
  host_name TEXT,
  color TEXT DEFAULT 'green',
  is_recurring BOOLEAN DEFAULT TRUE,
  is_collection BOOLEAN DEFAULT FALSE,
  is_prerecorded BOOLEAN DEFAULT FALSE,
  has_lineup BOOLEAN DEFAULT FALSE,
  is_modified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: schedule_slots_old
CREATE TABLE schedule_slots_old (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week SMALLINT NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  show_name TEXT NOT NULL,
  host_name TEXT,
  color TEXT DEFAULT 'green',
  is_recurring BOOLEAN DEFAULT TRUE,
  is_collection BOOLEAN DEFAULT FALSE,
  is_prerecorded BOOLEAN DEFAULT FALSE,
  has_lineup BOOLEAN DEFAULT FALSE,
  is_modified BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Table: day_notes
CREATE TABLE day_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  is_bottom_note BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: system_settings
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: email_settings
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject_template TEXT NOT NULL DEFAULT 'ליינאפ תוכנית {{show_name}}',
  body_template TEXT NOT NULL,
  email_method TEXT DEFAULT 'smtp',
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  gmail_client_id TEXT DEFAULT '',
  gmail_client_secret TEXT DEFAULT '',
  gmail_redirect_uri TEXT DEFAULT '',
  gmail_refresh_token TEXT DEFAULT '',
  gmail_access_token TEXT DEFAULT '',
  gmail_token_expiry TIMESTAMP WITH TIME ZONE,
  mailgun_domain TEXT,
  mailgun_api_key TEXT,
  is_eu_region BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: email_recipients
CREATE TABLE email_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: work_arrangements
CREATE TABLE work_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  week_start DATE NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: digital_work_arrangements
CREATE TABLE digital_work_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  notes TEXT,
  footer_text TEXT,
  footer_image_url TEXT,
  comic_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: digital_shifts
CREATE TABLE digital_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  shift_type TEXT NOT NULL,
  person_name TEXT,
  is_custom_time BOOLEAN DEFAULT FALSE,
  additional_text TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: digital_shift_custom_rows
CREATE TABLE digital_shift_custom_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  content TEXT,
  contents JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: digital_employees
CREATE TABLE digital_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: show_email_logs
CREATE TABLE show_email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN NOT NULL,
  error_message TEXT
);

-- Table: workers
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: producer_work_arrangements
CREATE TABLE IF NOT EXISTS producer_work_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: worker_divisions
CREATE TABLE IF NOT EXISTS worker_divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL,
  division_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_schedule_slots_updated_at
BEFORE UPDATE ON schedule_slots
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_schedule_slots_old_updated_at
BEFORE UPDATE ON schedule_slots_old
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER day_notes_updated_at
BEFORE UPDATE ON day_notes
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON email_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER digital_employees_updated_at
BEFORE UPDATE ON digital_employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER digital_work_arrangements_updated_at
BEFORE UPDATE ON digital_work_arrangements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER digital_shifts_updated_at
BEFORE UPDATE ON digital_shifts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER digital_shift_custom_rows_updated_at
BEFORE UPDATE ON digital_shift_custom_rows
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER producer_work_arrangements_updated_at
BEFORE UPDATE ON producer_work_arrangements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER worker_divisions_updated_at
BEFORE UPDATE ON worker_divisions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial system settings
INSERT INTO system_settings (key, value) VALUES 
('schedule_xml_refresh_interval', '10'),
('app_domain', 'http://localhost:8080'),
('schedule_data_offset', '0');

-- Create function for schedule XML generation
CREATE OR REPLACE FUNCTION generate_schedule_xml()
RETURNS TEXT AS $$
DECLARE
    xml_content TEXT;
BEGIN
    -- Generate initial XML header
    xml_content := '<?xml version="1.0" encoding="UTF-8"?><schedule>';
    
    -- Add schedule data from the database
    -- This is a simplified version - the real implementation would be more complex
    FOR row_data IN (
        SELECT 
            s.day_of_week, 
            s.start_time, 
            s.end_time, 
            s.show_name, 
            s.host_name 
        FROM 
            schedule_slots s
        WHERE 
            s.is_master = true
            AND s.is_deleted = FALSE
        ORDER BY 
            s.day_of_week, s.start_time
    ) LOOP
        xml_content := xml_content || '<show>';
        xml_content := xml_content || '<day>' || row_data.day_of_week || '</day>';
        xml_content := xml_content || '<start_time>' || row_data.start_time || '</start_time>';
        xml_content := xml_content || '<end_time>' || row_data.end_time || '</end_time>';
        xml_content := xml_content || '<name>' || row_data.show_name || '</name>';
        IF row_data.host_name IS NOT NULL THEN
            xml_content := xml_content || '<host>' || row_data.host_name || '</host>';
            xml_content := xml_content || '<combined>' || row_data.show_name || ' עם ' || row_data.host_name || '</combined>';
        ELSE
            xml_content := xml_content || '<combined>' || row_data.show_name || '</combined>';
        END IF;
        xml_content := xml_content || '</show>';
    END LOOP;
    
    -- Close XML document
    xml_content := xml_content || '</schedule>';
    
    RETURN xml_content;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO current_user;
