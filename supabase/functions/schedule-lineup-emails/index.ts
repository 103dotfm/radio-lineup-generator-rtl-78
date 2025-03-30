
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
    
    // Log start time for debugging
    const requestStartTime = new Date();
    console.log(`Function execution started at: ${requestStartTime.toISOString()}`);
    
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
        console.log(`Timezone offset from settings: ${timezoneOffset} hours`);
      }
    } catch (offsetError) {
      console.warn("Error fetching timezone offset, defaulting to 0:", offsetError);
    }
    
    // Create date object for current time
    const now = new Date();
    console.log(`Raw server time: ${now.toISOString()}`);
    
    // Calculate Israel time (UTC+3) without relying on client timezone
    const israelOffset = 3; // Israel is UTC+3 (3 hours ahead of UTC)
    
    // Get the current UTC time components
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    console.log(`UTC time: ${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`);
    
    // First calculate Israel time (UTC+3)
    const israelHours = (utcHours + israelOffset) % 24;
    console.log(`Israel time (UTC+3): ${israelHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`);
    
    // Then apply the user-defined timezone offset
    const adjustedHours = (israelHours + timezoneOffset) % 24;
    
    // Format the current time with the applied offset
    const currentTimeString = `${adjustedHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
    console.log(`Adjusted time with offset ${timezoneOffset}: ${currentTimeString}`);
    
    // Calculate time 1 minute ago for the window
    let oneMinuteAgoMinutes = utcMinutes - 1;
    let oneMinuteAgoHours = utcHours;
    
    // Handle minute rollover
    if (oneMinuteAgoMinutes < 0) {
      oneMinuteAgoMinutes = 59;
      oneMinuteAgoHours = (oneMinuteAgoHours - 1 + 24) % 24;
    }
    
    // First calculate one minute ago in Israel time
    const israelOneMinuteAgoHours = (oneMinuteAgoHours + israelOffset) % 24;
    
    // Then apply timezone offset to the one minute ago time
    const adjustedOneMinuteAgoHours = (israelOneMinuteAgoHours + timezoneOffset) % 24;
    const oneMinuteAgoTimeString = `${adjustedOneMinuteAgoHours.toString().padStart(2, '0')}:${oneMinuteAgoMinutes.toString().padStart(2, '0')}`;
    
    console.log(`Checking for shows between ${oneMinuteAgoTimeString} and ${currentTimeString}`);
    
    // Current day of week calculations
    // First get the UTC day
    const utcDay = now.getUTCDay();
    console.log(`UTC day of week: ${utcDay}`);
    
    // Calculate the Israel day by potentially adjusting for day rollover
    let israelDay = utcDay;
    if (utcHours + israelOffset >= 24) {
      israelDay = (utcDay + 1) % 7;
    }
    console.log(`Israel day of week: ${israelDay}`);
    
    // Apply timezone offset that might affect the day
    let adjustedDay = israelDay;
    
    // If the timezone offset pushes us back a day (negative offset)
    // or if it pushes us forward across day boundary
    if (israelHours + timezoneOffset < 0) {
      adjustedDay = (israelDay - 1 + 7) % 7;
    } else if (israelHours + timezoneOffset >= 24) {
      adjustedDay = (israelDay + 1) % 7;
    }
    
    console.log(`Final adjusted day with offset ${timezoneOffset}: ${adjustedDay}`);
    
    // Get all shows from Schedule slots for today that match the time window
    const { data: slots, error: slotsError } = await supabase
      .from("schedule_slots_old")
      .select("id, show_name, start_time")
      .eq("day_of_week", adjustedDay)
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
        JSON.stringify({ 
          message: "No shows to send emails for",
          debug: {
            serverTime: now.toISOString(),
            utcTime: `${utcHours}:${utcMinutes}`,
            israelTime: `${israelHours}:${utcMinutes}`,
            adjustedTime: currentTimeString,
            timezoneOffset,
            adjustedDay,
            searchWindow: {
              start: oneMinuteAgoTimeString,
              end: currentTimeString
            }
          }
        }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    const results = [];
    
    // For each slot, find the most recent show for the current date
    for (const slot of slots) {
      console.log(`Processing slot: ${slot.show_name} (${slot.start_time})`);
      
      // Get current date in YYYY-MM-DD format
      const nowUtc = new Date();
      
      // Adjust for Israel and timezone offset
      const totalOffsetHours = israelOffset + timezoneOffset;
      
      // Calculate if the date should roll forward or backward based on the offset
      let dateAdjustment = 0;
      if (utcHours + totalOffsetHours >= 24) {
        dateAdjustment = 1; // Add a day
      } else if (utcHours + totalOffsetHours < 0) {
        dateAdjustment = -1; // Subtract a day
      }
      
      // Create a new date object and adjust by the total offset
      const adjustedDate = new Date(nowUtc);
      adjustedDate.setUTCHours(nowUtc.getUTCHours() + totalOffsetHours);
      
      // Apply any date rollover
      if (dateAdjustment !== 0) {
        adjustedDate.setUTCDate(adjustedDate.getUTCDate() + dateAdjustment);
      }
      
      const todayDate = adjustedDate.toISOString().slice(0, 10); // YYYY-MM-DD
      
      console.log(`Looking for shows on date: ${todayDate}`);
      
      // Get the most recent show associated with this slot for today's date
      const { data: shows, error: showsError } = await supabase
        .from("shows_backup")
        .select("id, name, date")
        .eq("slot_id", slot.id)
        .eq("date", todayDate) // Filter for today's date explicitly
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
        console.log(`No shows found for slot ${slot.id} on date ${todayDate}`);
        
        // If no show found for today, log the issue and skip this slot
        results.push({
          slot: slot.id,
          success: false,
          error: `No shows found for slot on date ${todayDate}`
        });
        continue;
      }
      
      const show = shows[0];
      console.log(`Found show: ${show.name} (${show.id}) for date ${show.date}`);
      
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
        console.log(`Sending email for show ${show.id}`);
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
        
        console.log(`Email sent successfully for show ${show.id}`);
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
      JSON.stringify({ 
        results, 
        executionTime: new Date().getTime() - requestStartTime.getTime(),
        debug: {
          serverTime: now.toISOString(),
          utcTime: `${utcHours}:${utcMinutes}`,
          israelTime: `${israelHours}:${utcMinutes}`,
          adjustedTime: currentTimeString,
          timezoneOffset,
          adjustedDay,
          searchWindow: {
            start: oneMinuteAgoTimeString,
            end: currentTimeString
          }
        }
      }),
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
