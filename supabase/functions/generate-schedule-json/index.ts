import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format time as HH:MM
function formatTime(timeString: string): string {
  return timeString.substring(0, 5);
}

// Get show display info (show name and host) using the same logic as in the schedule component
function getShowDisplay(showName: string, hostName?: string): { displayName: string, displayHost: string } {
  if (!hostName || showName === hostName) {
    return { displayName: showName, displayHost: '' };
  }
  return { displayName: showName, displayHost: hostName };
}

// Get combined show display string (show name with host) based on the specified logic
function getCombinedShowDisplay(showName: string, hostName?: string): string {
  if (!hostName || showName === hostName) {
    return showName;
  }
  return `${showName} עם ${hostName}`;
}

// Get schedule slots for the next two weeks, starting from TODAY (not the week start), and skipping 'red' slots.
async function getScheduleSlots(supabase: any, startDate: Date) {
  try {
    // Calculate the end date (2 weeks from start)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log(`Fetching schedule from ${startDateStr} to ${endDateStr}`);

    // Fetch all slots for the time range
    const { data: slots, error } = await supabase
      .from('schedule_slots_old')
      .select(`
        *,
        shows:shows_backup (
          id,
          name,
          time,
          date,
          notes,
          created_at,
          slot_id
        )
      `)
      .or(`is_recurring.eq.false,is_recurring.eq.true`);

    if (error) {
      console.error("Error fetching slots:", error);
      throw new Error(`Failed to fetch schedule slots: ${error.message}`);
    }

    console.log(`Retrieved ${slots ? slots.length : 0} raw slots from database`);

    // Process slots to match dashboard logic – always starting from TODAY.
    const processedSlots = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const currentDayOfWeek = currentDate.getDay();
      const currentDateStr = formatDate(currentDate);

      for (const slot of slots) {
        // Only match slots for this day of week
        if (slot.day_of_week !== currentDayOfWeek) continue;

        // Only consider slots that are relevant for this date range
        if (!slot.is_recurring && formatDate(new Date(slot.created_at)) !== currentDateStr)
          continue;

        // Filter by slot color BEFORE processing for XML/JSON
        if (slot.color && slot.color.trim().toLowerCase() === "red") {
          continue;
        }

        // Check for modifications or deletions for this slot
        const matchingSlots = slots.filter(s =>
          s.day_of_week === slot.day_of_week && s.start_time === slot.start_time
        );

        const modification = matchingSlots.find(s =>
          !s.is_recurring &&
          formatDate(new Date(s.created_at)) === currentDateStr
        );

        if (modification) {
          if (!modification.is_deleted) {
            const displayInfo = getShowDisplay(modification.show_name, modification.host_name);
            processedSlots.push({
              ...modification,
              date: currentDateStr,
              actualDate: new Date(currentDate),
              displayName: displayInfo.displayName,
              displayHost: displayInfo.displayHost
            });
          }
        } else if (slot.is_recurring && !slot.is_deleted) {
          const displayInfo = getShowDisplay(slot.show_name, slot.host_name);
          processedSlots.push({
            ...slot,
            date: currentDateStr,
            actualDate: new Date(currentDate),
            displayName: displayInfo.displayName,
            displayHost: displayInfo.displayHost
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort processed slots by date and start time
    processedSlots.sort((a, b) => {
      if (a.date !== b.date) {
        return a.actualDate.getTime() - b.actualDate.getTime();
      }
      return a.start_time.localeCompare(b.start_time);
    });

    console.log(`Processed ${processedSlots.length} slots for JSON output`);
    return processedSlots;
  } catch (error) {
    console.error("Error in getScheduleSlots:", error);
    throw error;
  }
}

// Process a template string with schedule data
function processTemplate(template: string, show: any): string {
  try {
    return template
      .replace(/%showname/g, show.displayName || show.show_name || '')
      .replace(/%showhosts/g, show.displayHost || show.host_name || '')
      .replace(/%showcombined/g, show.combinedDisplay || getCombinedShowDisplay(show.show_name, show.host_name) || '')
      .replace(/%starttime/g, formatTime(show.start_time))
      .replace(/%endtime/g, formatTime(show.end_time))
      .replace(/%scheduledate/g, show.date || '');
  } catch (error) {
    console.error("Error in processTemplate:", error);
    throw new Error(`Template processing error: ${error.message}`);
  }
}

// Generate JSON from schedule data and template
function generateScheduleJSON(scheduleSlots: any[], template: string = ''): string {
  try {
    // If no template is provided, use a default one
    if (!template) {
      template = `{
  "schedule": [
    {
      "date": "%scheduledate",
      "startTime": "%starttime",
      "endTime": "%endtime",
      "showName": "%showname",
      "hosts": "%showhosts"
    }
  ]
}`;
    }

    // Determine if the template is an object with a schedule array
    let isArrayTemplate = false;
    let templateObj = null;
    
    try {
      templateObj = JSON.parse(template);
      isArrayTemplate = Array.isArray(templateObj.schedule);
    } catch (e) {
      console.warn("Template is not a valid JSON object, treating as a single-show template:", e);
    }

    if (isArrayTemplate && templateObj) {
      // The template has a schedule array, we'll replace it with actual shows
      const showsArray = scheduleSlots.map(slot => {
        try {
          // Process the template for each show
          const showTemplate = JSON.stringify(templateObj.schedule[0]);
          const processedShow = processTemplate(showTemplate, slot);
          return JSON.parse(processedShow);
        } catch (parseError) {
          console.error("Error processing show template:", parseError);
          // Fallback to a simple object if processing fails
          return {
            date: slot.date,
            startTime: formatTime(slot.start_time),
            endTime: formatTime(slot.end_time),
            showName: slot.displayName || slot.show_name,
            hosts: slot.displayHost || slot.host_name
          };
        }
      });

      // Replace the schedule array in the template
      templateObj.schedule = showsArray;
      return JSON.stringify(templateObj, null, 2);
    } else {
      // Treat as a single-item template and build array manually
      const result = {
        schedule: scheduleSlots.map(slot => {
          try {
            // Process the template for each show
            const showJson = processTemplate(template, slot);
            return JSON.parse(showJson);
          } catch (e) {
            console.error("Failed to parse processed template:", e);
            // Fallback to a simple object if parsing fails
            return {
              date: slot.date,
              startTime: formatTime(slot.start_time),
              endTime: formatTime(slot.end_time),
              showName: slot.displayName || slot.show_name,
              hosts: slot.displayHost || slot.host_name
            };
          }
        })
      };
      
      return JSON.stringify(result, null, 2);
    }
  } catch (error) {
    console.error("Error generating JSON:", error);
    // Return a valid JSON in case of error
    return JSON.stringify({ 
      error: "Failed to generate schedule JSON",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting JSON generation process");
    
    // Get template and offset from request if available
    let template = '';
    let previewOffset: number | undefined;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        template = body.template || '';
        previewOffset = body.previewOffset;
        console.log("Using template from request:", template.substring(0, 100) + "...");
        if (previewOffset !== undefined) {
          console.log("Using preview offset:", previewOffset);
        }
      } catch (e) {
        console.warn("Could not parse request body", e);
      }
    }
    
    // Create Supabase client
    const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // If no template in request, try to get it from the database
    if (!template) {
      const { data: templateData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'schedule_json_template')
        .maybeSingle();
        
      if (templateData?.value) {
        template = templateData.value;
      }
    }

    // Get offset from settings if not previewing
    let dataOffset = 0;
    if (previewOffset === undefined) {
      const { data: offsetData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'schedule_data_offset')
        .maybeSingle();
        
      if (offsetData?.value) {
        dataOffset = parseInt(offsetData.value) || 0;
      }
    } else {
      dataOffset = previewOffset;
    }
    
    // Get today's date as starting point
    const today = new Date();
    const adjustedDate = new Date(today);
    adjustedDate.setDate(today.getDate() + dataOffset);
    console.log(`Using date ${adjustedDate.toISOString()} (offset: ${dataOffset} days)`);
    
    // Get schedule slots
    const scheduleSlots = await getScheduleSlots(supabase, adjustedDate);
    
    // Add the combined display to each slot
    const enhancedSlots = scheduleSlots.map(slot => {
      const displayInfo = getShowDisplay(slot.show_name, slot.host_name);
      return {
        ...slot,
        displayName: displayInfo.displayName,
        displayHost: displayInfo.displayHost,
        combinedDisplay: getCombinedShowDisplay(slot.show_name, slot.host_name)
      };
    });
    
    // Generate JSON
    console.log("Generating JSON from schedule slots");
    const json = generateScheduleJSON(enhancedSlots, template);
    
    // If not previewing, store the generated JSON
    if (previewOffset === undefined) {
      console.log("Storing JSON in system_settings");
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_json', 
          value: json,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }
    
    return new Response(json, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("Error generating schedule JSON:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate schedule JSON",
        message: error instanceof Error ? error.message : "Unknown error"
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
