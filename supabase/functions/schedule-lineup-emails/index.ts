
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const functionStart = new Date();
    console.log(`Function execution started at: ${functionStart.toISOString()}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get timezone offset from system settings
    let timezoneOffset = 0;
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "timezone_offset")
        .single();
        
      if (!error && data && data.value) {
        timezoneOffset = parseInt(data.value);
        console.log(`Timezone offset from settings: ${timezoneOffset} hours`);
      }
    } catch (error) {
      console.warn("Error fetching timezone offset:", error);
    }
    
    // Current time calculation with timezone offset
    const now = new Date();
    console.log(`Raw server time: ${now.toISOString()}`);
    
    const utcTime = now.getUTCHours() + ":" + now.getUTCMinutes().toString().padStart(2, '0');
    console.log(`UTC time: ${utcTime}`);
    
    // Calculate Israel time (UTC+3, unless offset is different)
    const israelHours = (now.getUTCHours() + 3) % 24;
    const israelMinutes = now.getUTCMinutes();
    const israelTime = `${israelHours.toString().padStart(2, '0')}:${israelMinutes.toString().padStart(2, '0')}`;
    console.log(`Israel time (UTC+3): ${israelTime}`);
    
    // Apply custom timezone offset if configured
    const adjustedHours = (now.getUTCHours() + (timezoneOffset || 3)) % 24;
    const adjustedTime = `${adjustedHours.toString().padStart(2, '0')}:${israelMinutes.toString().padStart(2, '0')}`;
    console.log(`Adjusted time with offset ${timezoneOffset}: ${adjustedTime}`);
    
    // Time range for checking (current minute)
    const startTime = adjustedTime;
    
    // Calculate end time (1 minute later)
    const oneMinuteLater = new Date(now);
    oneMinuteLater.setUTCMinutes(oneMinuteLater.getUTCMinutes() + 1);
    const endHours = (oneMinuteLater.getUTCHours() + (timezoneOffset || 3)) % 24;
    const endMinutes = oneMinuteLater.getUTCMinutes();
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    console.log(`Checking for shows between ${startTime} and ${endTime}`);
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const utcDayOfWeek = now.getUTCDay();
    console.log(`UTC day of week: ${utcDayOfWeek}`);
    
    // Calculate Israel day of week
    let israelDayOfWeek = utcDayOfWeek;
    
    // If Israel time crosses midnight compared to UTC
    if (now.getUTCHours() + 3 >= 24) {
      israelDayOfWeek = (utcDayOfWeek + 1) % 7;
    }
    console.log(`Israel day of week: ${israelDayOfWeek}`);
    
    // Apply timezone offset to day of week if needed
    let adjustedDay = israelDayOfWeek;
    if (timezoneOffset) {
      // Calculate hours difference from Israel time
      const hoursDiff = timezoneOffset - 3;
      // If the difference crosses day boundary
      if ((israelHours + hoursDiff) >= 24) {
        adjustedDay = (israelDayOfWeek + 1) % 7;
      } else if ((israelHours + hoursDiff) < 0) {
        adjustedDay = (israelDayOfWeek - 1 + 7) % 7;
      }
    }
    console.log(`Final adjusted day with offset ${timezoneOffset}: ${adjustedDay}`);
    
    try {
      // Check if schedule_slots table exists
      console.log("Checking if schedule_slots table exists...");
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'schedule_slots');
        
      if (tablesError) {
        console.error("Error checking if schedule_slots table exists:", tablesError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Error checking if schedule_slots table exists",
            error: tablesError
          }),
          { 
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const scheduleSlotsExists = tables && tables.length > 0;
      console.log("Schedule slots table exists:", scheduleSlotsExists);

      if (!scheduleSlotsExists) {
        console.log("Schedule slots table does not exist");
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Schedule slots table does not exist"
          }),
          { 
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      // Query for schedule slots matching the current time and day
      const { data: scheduleSlots, error: scheduleSlotsError } = await supabase
        .from("schedule_slots")
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          show_name,
          host_name,
          shows (id, name, date)
        `)
        .eq("day_of_week", adjustedDay)
        .gte("start_time", startTime)
        .lt("start_time", endTime)
        .order("start_time");
      
      if (scheduleSlotsError) {
        console.error("Error fetching schedule slots:", scheduleSlotsError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to fetch schedule slots",
            error: scheduleSlotsError
          }),
          { 
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      
      console.log(`Found ${scheduleSlots?.length || 0} schedule slots in the current time range`);
      
      const results = [];
      
      // For each slot, find the most recent show and send its lineup
      if (scheduleSlots) {
        for (const slot of scheduleSlots) {
          try {
            // Get today's date in YYYY-MM-DD format
            const today = new Date();
            today.setUTCHours(today.getUTCHours() + (timezoneOffset || 3));
            const todayFormatted = today.toISOString().split('T')[0];
            
            console.log(`Processing schedule slot: ${slot.show_name} at ${slot.start_time}`);
            
            // Get the most recent show for this slot
            const { data: recentShows, error: recentShowsError } = await supabase
              .from("shows")
              .select("id, name, date")
              .eq("date", todayFormatted)
              .ilike("name", `%${slot.show_name}%`)
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (recentShowsError) {
              console.error(`Error fetching recent show for slot ${slot.id}:`, recentShowsError);
              results.push({
                slot_id: slot.id,
                success: false,
                error: recentShowsError.message
              });
              continue;
            }
            
            // If no show found for today, check for linked shows in the schedule slot
            let showToSend = null;
            
            if (recentShows && recentShows.length > 0) {
              showToSend = recentShows[0];
              console.log(`Found today's show: ${showToSend.name} (${showToSend.id})`);
            } else if (slot.shows && slot.shows.length > 0) {
              showToSend = slot.shows[0];
              console.log(`Using linked show: ${showToSend.name} (${showToSend.id})`);
            } else {
              console.log(`No show found for slot: ${slot.show_name}`);
              results.push({
                slot_id: slot.id,
                success: false,
                error: "No show found"
              });
              continue;
            }
            
            // Check if email was already sent for this show
            const { data: emailLog, error: emailLogError } = await supabase
              .from("show_email_logs")
              .select("*")
              .eq("show_id", showToSend.id)
              .limit(1);
            
            if (emailLogError) {
              console.error(`Error checking email log for show ${showToSend.id}:`, emailLogError);
            }
            
            if (emailLog && emailLog.length > 0) {
              console.log(`Email already sent for show ${showToSend.name} (${showToSend.id})`);
              results.push({
                slot_id: slot.id,
                show_id: showToSend.id,
                success: true,
                message: "Email already sent"
              });
              continue;
            }
            
            // Send email with lineup
            console.log(`Sending email for show ${showToSend.name} (${showToSend.id})`);
            
            try {
              const sendEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-lineup-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                  showId: showToSend.id
                })
              });
              
              let responseData;
              try {
                responseData = await sendEmailResponse.json();
              } catch (parseError) {
                console.error(`Error parsing response for show ${showToSend.id}:`, parseError);
                responseData = { error: "Failed to parse response" };
              }
              
              if (sendEmailResponse.ok) {
                console.log(`Successfully sent email for show ${showToSend.name} (${showToSend.id})`);
                results.push({
                  slot_id: slot.id,
                  show_id: showToSend.id,
                  success: true
                });
              } else {
                console.error(`Failed to send email for show ${showToSend.name} (${showToSend.id}):`, responseData);
                results.push({
                  slot_id: slot.id,
                  show_id: showToSend.id,
                  success: false,
                  error: responseData.error || "Unknown error"
                });
              }
            } catch (sendError) {
              console.error(`Error sending email for show ${showToSend.name} (${showToSend.id}):`, sendError);
              results.push({
                slot_id: slot.id,
                show_id: showToSend.id,
                success: false,
                error: sendError.message
              });
            }
          } catch (slotError) {
            console.error(`Error processing slot ${slot.id}:`, slotError);
            results.push({
              slot_id: slot.id,
              success: false,
              error: slotError.message
            });
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          time_checked: adjustedTime,
          day_checked: adjustedDay,
          slots_count: scheduleSlots?.length || 0,
          results
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error in schedule-lineup-emails function:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Error in schedule-lineup-emails function",
          error: error.message
        }),
        { 
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Critical error in schedule-lineup-emails function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Critical error in schedule-lineup-emails function",
        error: error.message
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
