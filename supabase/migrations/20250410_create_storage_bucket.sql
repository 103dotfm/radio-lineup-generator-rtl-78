
-- Create storage bucket for lovable if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'lovable'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('lovable', 'lovable', true);
    
    -- Add universal policies for all operations
    INSERT INTO storage.policies (name, definition, bucket_id, operation)
    VALUES 
      ('Universal Insert', 'TRUE', 'lovable', 'INSERT'),
      ('Universal Select', 'TRUE', 'lovable', 'SELECT'),
      ('Universal Update', 'TRUE', 'lovable', 'UPDATE'),
      ('Universal Delete', 'TRUE', 'lovable', 'DELETE');
  END IF;
END $$;
