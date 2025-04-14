
-- Create functions to manage cron jobs for XML refresh
CREATE OR REPLACE FUNCTION public.create_cron_job(
  job_name TEXT,
  cron_schedule TEXT, 
  function_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure the cron extension is available
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Create the cron job to invoke the edge function
  PERFORM cron.schedule(
    job_name,
    cron_schedule,
    $$
    SELECT net.http_post(
      url:='https://yyrmodgbnzqbmatlypuc.supabase.co/functions/v1/' || function_name,
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.anon_key', true) || '"}'::jsonb,
      body:='{}'::jsonb
    ) AS request_id;
    $$
  );
END;
$$;

-- Function to delete a cron job
CREATE OR REPLACE FUNCTION public.delete_cron_job(
  job_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure the cron extension is available
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Unschedule the job if it exists
  PERFORM cron.unschedule(job_name);
END;
$$;
