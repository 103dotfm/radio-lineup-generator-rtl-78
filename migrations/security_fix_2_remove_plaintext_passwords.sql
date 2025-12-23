-- Security Fix 2: Remove plaintext password storage
-- This migration removes the password_readable column from workers table

-- First, create a backup of any existing password_readable data (for audit purposes)
CREATE TABLE IF NOT EXISTS workers_password_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL,
    worker_name TEXT NOT NULL,
    worker_email TEXT,
    password_readable TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT DEFAULT 'Backup before security fix - plaintext passwords removed'
);

-- Backup existing password_readable data
INSERT INTO workers_password_audit (worker_id, worker_name, worker_email, password_readable)
SELECT 
    w.id,
    w.name,
    w.email,
    w.password_readable
FROM workers w
WHERE w.password_readable IS NOT NULL AND w.password_readable != '';

-- Remove the password_readable column
ALTER TABLE workers DROP COLUMN IF EXISTS password_readable;

-- Add comment to document the change
COMMENT ON TABLE workers_password_audit IS 'Audit table for plaintext passwords removed during security fix';
