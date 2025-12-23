-- Create producer_work_arrangements table
CREATE TABLE IF NOT EXISTS producer_work_arrangements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on week_start for faster lookups
CREATE INDEX IF NOT EXISTS idx_producer_work_arrangements_week_start ON producer_work_arrangements(week_start);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_producer_work_arrangements_updated_at
    BEFORE UPDATE ON producer_work_arrangements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 