
-- Create storage bucket for lovable if it doesn't exist
BEGIN;

-- First ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('lovable', 'lovable', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clear any existing policies to start fresh
DELETE FROM storage.policies WHERE bucket_id = 'lovable';

-- Create completely open policies for all operations
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES 
  ('Allow All Inserts', 'TRUE', 'lovable', 'INSERT'),
  ('Allow All Selects', 'TRUE', 'lovable', 'SELECT'),
  ('Allow All Updates', 'TRUE', 'lovable', 'UPDATE'),
  ('Allow All Deletes', 'TRUE', 'lovable', 'DELETE');

COMMIT;
