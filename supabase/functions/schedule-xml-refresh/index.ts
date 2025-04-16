
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
    console.log("Starting XML refresh scheduler setup");
    // Create Supabase client
    const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Getting refresh interval from system_settings");
    
    // Try to get the refresh interval from system_settings
    let { data: intervalData, error: intervalError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_xml_refresh_interval')
      .maybeSingle();
      
    if (intervalError) {
      console.error("Error fetching refresh interval:", intervalError);
      // Instead of throwing, we'll use a default value
      console.log("Using default interval of 10 minutes");
      intervalData = { value: "10" };
    }
    
    // If no data was found, create the setting with a default value
    if (!intervalData) {
      console.log("No refresh interval found, creating with default of 10 minutes");
      
      const { error: insertError } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml_refresh_interval', 
          value: '10' 
        }, { onConflict: 'key' });
        
      if (insertError) {
        console.error("Error creating refresh interval setting:", insertError);
      }
      
      intervalData = { value: "10" };
    }
    
    // Use the interval data
    const refreshIntervalMinutes = parseInt(intervalData.value || "10");
    console.log(`Using refresh interval: ${refreshIntervalMinutes} minutes`);
    
    // Set up the cron job using Postgres
    // First, we'll delete any existing job for this function
    console.log("Removing any existing cron job");
    await supabase.rpc('delete_cron_job', { job_name: 'schedule_xml_refresh' });
    
    // Then create a new one with the current interval
    const cronExpression = `*/${refreshIntervalMinutes} * * * *`;  // Run every X minutes
    console.log(`Setting up cron job with expression: ${cronExpression}`);
    
    await supabase.rpc('create_cron_job', {
      job_name: 'schedule_xml_refresh',
      cron_schedule: cronExpression,
      function_name: 'generate-schedule-xml'
    });
    
    // Also, trigger an immediate refresh
    console.log("Triggering immediate refresh of XML");
    const { data: refreshData, error: refreshError } = await supabase.functions.invoke('generate-schedule-xml');
    
    if (refreshError) {
      console.error("Error refreshing XML:", refreshError);
    } else {
      console.log("XML refreshed successfully, length:", refreshData ? refreshData.length : 0);
      
      // Verify the XML was stored in the database
      const { data: verifyData, error: verifyError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'schedule_xml')
        .maybeSingle();
        
      if (verifyError) {
        console.error("Error verifying XML storage:", verifyError);
      } else if (verifyData && verifyData.value) {
        console.log("Verified XML is stored in database, length:", verifyData.value.length);
      } else {
        console.warn("XML does not appear to be stored in database correctly");
      }
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
