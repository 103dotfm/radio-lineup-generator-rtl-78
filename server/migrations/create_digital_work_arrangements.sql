-- Create digital_work_arrangements table
CREATE TABLE IF NOT EXISTS digital_work_arrangements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    notes TEXT,
    footer_text TEXT,
    footer_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on week_start for faster lookups
CREATE INDEX IF NOT EXISTS idx_digital_work_arrangements_week_start ON digital_work_arrangements(week_start);

-- Create digital_shifts table
CREATE TABLE IF NOT EXISTS digital_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrangement_id UUID NOT NULL REFERENCES digital_work_arrangements(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    shift_type TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    person_name TEXT,
    additional_text TEXT,
    is_custom_time BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for digital_shifts
CREATE INDEX IF NOT EXISTS idx_digital_shifts_arrangement_id ON digital_shifts(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_digital_shifts_section_name ON digital_shifts(section_name);
CREATE INDEX IF NOT EXISTS idx_digital_shifts_position ON digital_shifts(position);

-- Create digital_shift_custom_rows table
CREATE TABLE IF NOT EXISTS digital_shift_custom_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrangement_id UUID NOT NULL REFERENCES digital_work_arrangements(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    contents JSONB,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for digital_shift_custom_rows
CREATE INDEX IF NOT EXISTS idx_digital_shift_custom_rows_arrangement_id ON digital_shift_custom_rows(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_digital_shift_custom_rows_section_name ON digital_shift_custom_rows(section_name);
CREATE INDEX IF NOT EXISTS idx_digital_shift_custom_rows_position ON digital_shift_custom_rows(position);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_digital_work_arrangements_updated_at
    BEFORE UPDATE ON digital_work_arrangements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_shifts_updated_at
    BEFORE UPDATE ON digital_shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_shift_custom_rows_updated_at
    BEFORE UPDATE ON digital_shift_custom_rows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 