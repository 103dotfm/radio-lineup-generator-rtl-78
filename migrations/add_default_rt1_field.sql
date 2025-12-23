-- Add default_rt1 field to rds_settings table
-- This field stores the default RT1 message when no show is scheduled
ALTER TABLE rds_settings 
ADD COLUMN IF NOT EXISTS default_rt1 TEXT DEFAULT 'https://103.fm - Download our app from App Store & Play Store';

-- Update existing records to have the default value (fixing the wrong ASCII characters)
UPDATE rds_settings 
SET default_rt1 = 'https://103.fm - Download our app from App Store & Play Store'
WHERE default_rt1 IS NULL;




