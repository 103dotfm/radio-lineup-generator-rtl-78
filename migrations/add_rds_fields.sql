-- Add RDS fields to schedule_slots table
ALTER TABLE schedule_slots 
ADD COLUMN IF NOT EXISTS rds_pty INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rds_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rds_radio_text TEXT,
ADD COLUMN IF NOT EXISTS rds_radio_text_translated TEXT;

-- Create rds_settings table for global RDS configuration
CREATE TABLE IF NOT EXISTS rds_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    send_rds_on_program_change BOOLEAN DEFAULT true,
    rds_rt2 TEXT,
    rds_rt3 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default RDS settings if table is empty
INSERT INTO rds_settings (send_rds_on_program_change, rds_rt2, rds_rt3)
SELECT true, '', ''
WHERE NOT EXISTS (SELECT 1 FROM rds_settings);

-- Create trigger for rds_settings updated_at
CREATE TRIGGER update_rds_settings_updated_at
    BEFORE UPDATE ON rds_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
