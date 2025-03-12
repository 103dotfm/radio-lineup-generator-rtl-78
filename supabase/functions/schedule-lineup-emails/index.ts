
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get timezone offset from system settings
    let timezoneOffset = 0;
    try {
      const { data: offsetData, error: offsetError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "timezone_offset")
        .single();
        
      if (!offsetError && offsetData && offsetData.value) {
        timezoneOffset = parseInt(offsetData.value) || 0;
        console.log(`Timezone offset: ${timezoneOffset} hours`);
      }
    } catch (offsetError) {
      console.warn("Error fetching timezone offset, defaulting to 0:", offsetError);
    }
    
    // Get the current date and time in Israel time zone
    const now = new Date();
    const israelOffset = 180; // Israel timezone offset in minutes (UTC+3)
    const clientOffset = now.getTimezoneOffset();
    const totalOffset = israelOffset + clientOffset;
    now.setMinutes(now.getMinutes() + totalOffset);
    
    // Apply additional user-defined timezone offset (from system settings)
    now.setHours(now.getHours() + timezoneOffset);
    
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Calculate the time window (1 minute ago)
    const oneMinuteAgo = new Date(now);
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);
    
    const oneMinuteAgoHour = oneMinuteAgo.getHours();
    const oneMinuteAgoMinute = oneMinuteAgo.getMinutes();
    
    // Format time strings for comparison
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const oneMinuteAgoTimeString = `${oneMinuteAgoHour.toString().padStart(2, '0')}:${oneMinuteAgoMinute.toString().padStart(2, '0')}`;
    
    console.log(`Checking for shows between ${oneMinuteAgoTimeString} and ${currentTimeString} with timezone offset: ${timezoneOffset}`);
    
    // Current day of week in Israel (0 = Sunday, 6 = Saturday)
    const dayOfWeek = now.getDay();
    console.log(`Current day of week: ${dayOfWeek}`);
    
    // Get all shows from Schedule slots for today that match the time window
    const { data: slots, error: slotsError } = await supabase
      .from("schedule_slots")
      .select("id, show_name, start_time")
      .eq("day_of_week", dayOfWeek)
      .eq("has_lineup", true)
      .gte("start_time", oneMinuteAgoTimeString)
      .lt("start_time", currentTimeString);
    
    if (slotsError) {
      console.error("Error fetching schedule slots:", slotsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch schedule slots" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    console.log(`Found ${slots?.length || 0} slots in the time window`);
    
    if (!slots || slots.length === 0) {
      return new Response(
        JSON.stringify({ message: "No shows to send emails for" }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    const results = [];
    
    // For each slot, find the most recent show
    for (const slot of slots) {
      console.log(`Processing slot: ${slot.show_name} (${slot.start_time})`);
      
      // Get the most recent show associated with this slot
      const { data: shows, error: showsError } = await supabase
        .from("shows")
        .select("id, name")
        .eq("slot_id", slot.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (showsError) {
        console.error(`Error fetching shows for slot ${slot.id}:`, showsError);
        results.push({
          slot: slot.id,
          success: false,
          error: "Failed to fetch shows for slot"
        });
        continue;
      }
      
      if (!shows || shows.length === 0) {
        console.log(`No shows found for slot ${slot.id}`);
        results.push({
          slot: slot.id,
          success: false,
          error: "No shows found for slot"
        });
        continue;
      }
      
      const show = shows[0];
      console.log(`Found show: ${show.name} (${show.id})`);
      
      // Check if we've already sent an email for this show
      const { data: logs, error: logsError } = await supabase
        .from("show_email_logs")
        .select("id, success")
        .eq("show_id", show.id);
      
      if (logsError) {
        console.error(`Error fetching email logs for show ${show.id}:`, logsError);
        results.push({
          show: show.id,
          success: false,
          error: "Failed to fetch email logs"
        });
        continue;
      }
      
      // Skip if we've already sent an email for this show
      if (logs && logs.length > 0 && logs[0].success) {
        console.log(`Email already sent for show ${show.id}`);
        results.push({
          show: show.id,
          success: false,
          error: "Email already sent"
        });
        continue;
      }
      
      // Send email for this show
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/send-lineup-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ showId: show.id })
          }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Error sending email for show ${show.id}:`, result);
          results.push({
            show: show.id,
            success: false,
            error: result.error || "Failed to send email"
          });
          continue;
        }
        
        console.log(`Email sent for show ${show.id}`);
        results.push({
          show: show.id,
          success: true
        });
      } catch (error) {
        console.error(`Error calling send-lineup-email for show ${show.id}:`, error);
        results.push({
          show: show.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({ results }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error) {
    console.error("Error in schedule-lineup-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
