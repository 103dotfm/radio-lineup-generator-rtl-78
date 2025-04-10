
-- Create policy to allow universal file uploads for lovable bucket
DO $$
BEGIN
  -- Try to delete existing policies for cleaner setup
  BEGIN
    DELETE FROM storage.policies 
    WHERE bucket_id = 'lovable';
  EXCEPTION WHEN OTHERS THEN
    -- If it fails, just proceed
    RAISE NOTICE 'Policy did not exist or could not be deleted: %', SQLERRM;
  END;

  -- Insert the policy with universal access
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES 
    ('Universal Insert', 'TRUE', 'lovable', 'INSERT'),
    ('Universal Select', 'TRUE', 'lovable', 'SELECT'),
    ('Universal Update', 'TRUE', 'lovable', 'UPDATE'),
    ('Universal Delete', 'TRUE', 'lovable', 'DELETE');

  -- Ensure the bucket is set to public
  UPDATE storage.buckets 
  SET public = true 
  WHERE id = 'lovable';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;
