-- Create digital_work_arrangements table
CREATE TABLE IF NOT EXISTS digital_work_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create digital_shifts table
CREATE TABLE IF NOT EXISTS digital_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES digital_work_arrangements(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  section_name VARCHAR(50) NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  shift_type VARCHAR(50) NOT NULL,
  is_custom_time BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME,
  person_name VARCHAR(255),
  additional_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create digital_shift_custom_rows table
CREATE TABLE IF NOT EXISTS digital_shift_custom_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES digital_work_arrangements(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  section_name VARCHAR(50) NOT NULL,
  contents JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_digital_work_arrangements_week_start ON digital_work_arrangements(week_start);
CREATE INDEX IF NOT EXISTS idx_digital_shifts_arrangement_id ON digital_shifts(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_digital_shifts_position ON digital_shifts(position);
CREATE INDEX IF NOT EXISTS idx_digital_shift_custom_rows_arrangement_id ON digital_shift_custom_rows(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_digital_shift_custom_rows_position ON digital_shift_custom_rows(position); 