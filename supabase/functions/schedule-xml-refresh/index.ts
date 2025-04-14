
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client
    const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the refresh interval from system_settings
    const { data: intervalData, error: intervalError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_xml_refresh_interval')
      .single();
      
    if (intervalError) {
      console.error("Error fetching refresh interval:", intervalError);
      throw new Error(`Failed to fetch refresh interval: ${intervalError.message}`);
    }
    
    // Default to 10 minutes if not set
    const refreshIntervalMinutes = intervalData ? parseInt(intervalData.value) : 10;
    
    // Set up the cron job using Postgres
    // First, we'll delete any existing job for this function
    await supabase.rpc('delete_cron_job', { job_name: 'schedule_xml_refresh' });
    
    // Then create a new one with the current interval
    const cronExpression = `*/${refreshIntervalMinutes} * * * *`;  // Run every X minutes
    
    await supabase.rpc('create_cron_job', {
      job_name: 'schedule_xml_refresh',
      cron_schedule: cronExpression,
      function_name: 'generate-schedule-xml'
    });
    
    // Also, trigger an immediate refresh
    const { data: refreshData, error: refreshError } = await supabase.functions.invoke('generate-schedule-xml');
    
    if (refreshError) {
      console.error("Error refreshing XML:", refreshError);
    }
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Schedule XML refresh job updated to run every ${refreshIntervalMinutes} minutes`,
        nextRun: new Date(Date.now() + refreshIntervalMinutes * 60 * 1000).toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Error setting up schedule XML refresh:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
