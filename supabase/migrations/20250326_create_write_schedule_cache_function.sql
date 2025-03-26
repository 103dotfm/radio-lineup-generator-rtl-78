
-- Create a function to write the schedule cache to the public directory
CREATE OR REPLACE FUNCTION public.write_schedule_cache(cache_content TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log that the function is being called
  RAISE NOTICE 'Writing schedule cache to file: %', substring(cache_content from 1 for 50);
  
  -- Update or insert into the system_settings table
  INSERT INTO system_settings (key, value, updated_at)
  VALUES ('schedule_cache', cache_content, now())
  ON CONFLICT (key) 
  DO UPDATE SET value = cache_content, updated_at = now();
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error writing schedule cache: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.write_schedule_cache TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_schedule_cache TO anon;
GRANT EXECUTE ON FUNCTION public.write_schedule_cache TO service_role;
