
-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the task to run every 10 minutes
SELECT cron.schedule(
  'refresh-schedule-xml-every-10-minutes',
  '*/10 * * * *', -- run every 10 minutes
  $$
  SELECT
    net.http_get(
      url:='https://yyrmodgbnzqbmatlypuc.supabase.co/functions/v1/schedule-xml',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0"}'::jsonb
    ) as request_id;
  $$
);
