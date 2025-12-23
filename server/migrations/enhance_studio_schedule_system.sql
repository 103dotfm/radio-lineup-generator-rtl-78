-- Enhanced Studio Schedule System Migration
-- This migration adds Google Calendar sync, engineer work arrangements, and approval workflow

-- Google Calendar sync tracking
CREATE TABLE IF NOT EXISTS google_calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type TEXT NOT NULL, -- 'import', 'export', 'bidirectional'
  status TEXT NOT NULL, -- 'success', 'failed', 'partial', 'conflict'
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  error_message TEXT,
  sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sync_completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Google Calendar event mapping
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_booking_id UUID REFERENCES studio_bookings(id) ON DELETE CASCADE,
  google_event_id TEXT UNIQUE,
  google_calendar_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'failed', 'conflict'
  conflict_details TEXT
);

-- Studio booking approval workflow
CREATE TABLE IF NOT EXISTS studio_booking_approvers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Engineer work arrangements
CREATE TABLE IF NOT EXISTS engineer_work_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Engineer shifts
CREATE TABLE IF NOT EXISTS engineer_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID NOT NULL REFERENCES engineer_work_arrangements(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  section_name VARCHAR(50) NOT NULL, -- 'morning', 'evening', 'special'
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  shift_type VARCHAR(50) NOT NULL, -- 'regular', 'studio_assignment', 'special'
  is_custom_time BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME,
  person_name VARCHAR(255),
  additional_text TEXT,
  studio_id INTEGER REFERENCES studios(id), -- for studio-specific assignments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email queue for notifications
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipients TEXT NOT NULL, -- JSON array of email addresses
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'studio_booking_request', 'studio_booking_status', etc.
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_booking_id ON google_calendar_events(studio_booking_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_sync_status ON google_calendar_events(sync_status);
CREATE INDEX IF NOT EXISTS idx_engineer_shifts_arrangement_id ON engineer_shifts(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_engineer_shifts_studio_id ON engineer_shifts(studio_id);
CREATE INDEX IF NOT EXISTS idx_engineer_work_arrangements_week_start ON engineer_work_arrangements(week_start);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Add triggers for updated_at columns
CREATE TRIGGER update_engineer_work_arrangements_updated_at
BEFORE UPDATE ON engineer_work_arrangements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engineer_shifts_updated_at
BEFORE UPDATE ON engineer_shifts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert initial engineer work arrangement for current week
INSERT INTO engineer_work_arrangements (week_start, is_published, notes) 
VALUES (
  DATE_TRUNC('week', CURRENT_DATE),
  false,
  'Initial engineer work arrangement - please edit with actual data'
);

-- Insert sample engineer shifts (5 seats as requested)
INSERT INTO engineer_shifts (
  arrangement_id, 
  position, 
  name, 
  section_name, 
  day_of_week, 
  shift_type, 
  start_time, 
  end_time, 
  person_name,
  studio_id
) VALUES 
-- Morning shifts (Sunday)
((SELECT id FROM engineer_work_arrangements ORDER BY created_at DESC LIMIT 1), 1, 'Morning Shift - Studio B', 'morning', 1, 'studio_assignment', '06:00', '14:00', 'John Doe', 2),
((SELECT id FROM engineer_work_arrangements ORDER BY created_at DESC LIMIT 1), 2, 'Morning Shift - Studio G', 'morning', 1, 'studio_assignment', '06:00', '14:00', 'Jane Smith', 1),
((SELECT id FROM engineer_work_arrangements ORDER BY created_at DESC LIMIT 1), 3, 'Morning Shift - General', 'morning', 1, 'regular', '06:00', '14:00', 'Mike Johnson', NULL),
-- Evening shifts (Sunday)
((SELECT id FROM engineer_work_arrangements ORDER BY created_at DESC LIMIT 1), 4, 'Evening Shift - Studio B', 'evening', 1, 'studio_assignment', '14:00', '22:00', 'Sarah Wilson', 2),
((SELECT id FROM engineer_work_arrangements ORDER BY created_at DESC LIMIT 1), 5, 'Evening Shift - General', 'evening', 1, 'regular', '14:00', '22:00', 'David Brown', NULL);

-- Add sample studio booking for demonstration (Lifestyle Podcast Recording)
INSERT INTO studio_bookings (
  studio_id, 
  booking_date, 
  start_time, 
  end_time, 
  title, 
  notes, 
  status
) VALUES (
  2, -- Studio B (אולפן ג')
  '2025-10-25', -- Sunday
  '09:00',
  '10:00',
  'Lifestyle Podcast Recording',
  'Assigned engineer: John Doe',
  'approved'
);

