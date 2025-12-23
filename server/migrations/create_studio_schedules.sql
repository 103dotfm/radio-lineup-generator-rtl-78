-- Create studios table
CREATE TABLE IF NOT EXISTS studios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Insert initial studios
INSERT INTO studios (name) VALUES ('אולפן ב'''), ('אולפן ג''');

-- Create studio_bookings table
CREATE TABLE IF NOT EXISTS studio_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id INTEGER REFERENCES studios(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  recurrence_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_studio_bookings_studio_date ON studio_bookings(studio_id, booking_date);

-- Add updated_at trigger
CREATE TRIGGER update_studio_bookings_updated_at
BEFORE UPDATE ON studio_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- TODO: Add constraint to prevent overlapping bookings 