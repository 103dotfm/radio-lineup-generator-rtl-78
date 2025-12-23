-- Migration: Add is_eu_region field to email_settings table
-- This migration adds the missing is_eu_region field that is used in the frontend and backend code

-- Check if the column already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'email_settings' 
        AND column_name = 'is_eu_region'
    ) THEN
        -- Add the is_eu_region column
        ALTER TABLE email_settings 
        ADD COLUMN is_eu_region BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Added is_eu_region column to email_settings table';
    ELSE
        RAISE NOTICE 'is_eu_region column already exists in email_settings table';
    END IF;
END $$; 