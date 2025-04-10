
-- Update storage bucket policies with universal access
BEGIN;

-- Clear existing policies
DELETE FROM storage.policies WHERE bucket_id = 'lovable';

-- Add completely permissive policies
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES 
  ('Allow All Inserts', 'TRUE', 'lovable', 'INSERT'),
  ('Allow All Selects', 'TRUE', 'lovable', 'SELECT'),
  ('Allow All Updates', 'TRUE', 'lovable', 'UPDATE'),
  ('Allow All Deletes', 'TRUE', 'lovable', 'DELETE');

-- Ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lovable';

COMMIT;
