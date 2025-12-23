-- Add override fields to rds_settings table
ALTER TABLE rds_settings 
ADD COLUMN IF NOT EXISTS override_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_pty INTEGER,
ADD COLUMN IF NOT EXISTS override_ms INTEGER,
ADD COLUMN IF NOT EXISTS override_rt1 TEXT;

-- Update existing records to have default values
UPDATE rds_settings 
SET override_enabled = false,
    override_pty = NULL,
    override_ms = NULL,
    override_rt1 = NULL
WHERE override_enabled IS NULL;
