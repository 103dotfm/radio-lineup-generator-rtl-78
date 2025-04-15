
-- Create function to create cron jobs if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_cron_job(
  job_name text,
  cron_schedule text,
  function_name text
) RETURNS void AS $$
BEGIN
  -- Check if the pg_cron extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Delete any existing job with this name
    PERFORM cron.unschedule(job_name);
    
    -- Create the cron job
    PERFORM cron.schedule(
      job_name,
      cron_schedule,
      $$
      SELECT net.http_post(
        url:='https://yyrmodgbnzqbmatlypuc.supabase.co/functions/v1/$$|| function_name ||$$',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0"}'::jsonb,
        body:='{}'::jsonb
      );
      $$
    );
  ELSE
    RAISE NOTICE 'pg_cron extension is not installed. Cron job not created.';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to delete cron jobs
CREATE OR REPLACE FUNCTION public.delete_cron_job(
  job_name text
) RETURNS void AS $$
BEGIN
  -- Check if the pg_cron extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Delete the job if it exists
    PERFORM cron.unschedule(job_name);
  ELSE
    RAISE NOTICE 'pg_cron extension is not installed. No job to delete.';
  END IF;
END;
$$ LANGUAGE plpgsql;
