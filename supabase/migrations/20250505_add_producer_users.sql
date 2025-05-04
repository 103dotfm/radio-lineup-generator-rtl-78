
-- Add user_id and auth data to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS password_readable TEXT NULL;
