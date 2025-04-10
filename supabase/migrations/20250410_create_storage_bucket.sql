
-- Create storage bucket for lovable if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'lovable'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('lovable', 'lovable', true);
  END IF;
END $$;

-- Create or update storage policy for public read access
DO $$
BEGIN
  INSERT INTO storage.policies (name, definition, bucket_id)
  VALUES (
    'Public Read Access', 
    '(bucket_id = ''lovable''::text)', 
    'lovable'
  )
  ON CONFLICT (name, bucket_id) 
  DO UPDATE SET definition = '(bucket_id = ''lovable''::text)';
EXCEPTION WHEN duplicate_object THEN
  -- Policy already exists, do nothing
END $$;
