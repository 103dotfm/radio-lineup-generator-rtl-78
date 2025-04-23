import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
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
      
      // For each recurring/nonrecurring slot, process for current date only (not from week start)
      for (const slot of slots) {
        // Only match slots for this day of week
        if (slot.day_of_week !== currentDayOfWeek) continue;
        
        // Only consider slots that are relevant for this date range
        // For non-recurring, must be for this actual calendar date
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
        
        // If there's a non-recurring modification for the current date
        const modification = matchingSlots.find(s =>
          !s.is_recurring &&
          formatDate(new Date(s.created_at)) === currentDateStr
        );
        
        if (modification) {
          if (!modification.is_deleted) {
            processedSlots.push({
              ...modification,
              date: currentDateStr,
              actualDate: new Date(currentDate)
            });
          }
        } else if (slot.is_recurring && !slot.is_deleted) {
          processedSlots.push({
            ...slot,
            date: currentDateStr,
            actualDate: new Date(currentDate)
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
    
    console.log(`Processed ${processedSlots.length} slots for XML output`);
    return processedSlots;
  } catch (error) {
    console.error("Error in getScheduleSlots:", error);
    throw error;
  }
}

// Escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Process a template string with schedule data
function processTemplate(template: string, show: any): string {
  // Explicitly log the values being substituted for debugging
  console.log("Show data for template:", {
    showName: show.displayName || show.show_name || '',
    hostName: show.displayHost || show.host_name || '',
    combinedDisplay: show.combinedDisplay || '',
    startTime: formatTime(show.start_time),
    endTime: formatTime(show.end_time),
    date: show.date || ''
  });

  // Process the template with all substitutions
  return template
    .replace(/%showname/g, escapeXml(show.displayName || show.show_name || ''))
    .replace(/%showhosts/g, escapeXml(show.displayHost || show.host_name || ''))
    .replace(/%showcombined/g, escapeXml(show.combinedDisplay || ''))
    .replace(/%starttime/g, formatTime(show.start_time))
    .replace(/%endtime/g, formatTime(show.end_time))
    .replace(/%scheduledate/g, show.date || '');
}

// Generate XML from schedule data and template
function generateScheduleXML(scheduleSlots: any[], template: string = ''): string {
  try {
    // If no template is provided, use a default one
    if (!template) {
      template = `<?xml version="1.0" encoding="UTF-8"?>
<schedule>
  <!-- For each show in the schedule -->
  <show>
    <date>%scheduledate</date>
    <start_time>%starttime</start_time>
    <end_time>%endtime</end_time>
    <name>%showname</name>
    <host>%showhosts</host>
    <combined>%showcombined</combined>
  </show>
</schedule>`;
    }

    // Extract the parts before and after the show template
    const showStartTag = "<show>";
    const showEndTag = "</show>";
    
    const showStartIndex = template.indexOf(showStartTag);
    const showEndIndex = template.indexOf(showEndTag) + showEndTag.length;
    
    if (showStartIndex === -1 || showEndIndex === -1) {
      throw new Error("Template must contain at least one <show> element");
    }
    
    const headerPart = template.substring(0, showStartIndex);
    const showTemplate = template.substring(showStartIndex, showEndIndex);
    const footerPart = template.substring(showEndIndex);
    
    // Now build the XML with each show
    let xml = headerPart;
    
    // Track seen shows to avoid duplicating 2-hour shows
    const seenShows = new Set();
    let showCount = 0;
    
    for (const slot of scheduleSlots) {
      // Create a unique identifier for this show instance
      const showKey = `${slot.date}_${slot.start_time}_${slot.show_name}_${slot.host_name}`;
      
      // Skip if we've already included this show
      if (seenShows.has(showKey)) continue;
      seenShows.add(showKey);
      
      // Add the combined display to the slot
      const displayInfo = getShowDisplay(slot.show_name, slot.host_name);
      const enhancedSlot = {
        ...slot,
        displayName: displayInfo.displayName,
        displayHost: displayInfo.displayHost,
        combinedDisplay: getCombinedShowDisplay(slot.show_name, slot.host_name)
      };
      
      // Process the show template for this slot
      const processedShow = processTemplate(showTemplate, enhancedSlot);
      xml += processedShow;
      showCount++;
    }
    
    xml += footerPart;
    console.log(`Generated XML with ${showCount} shows, length: ${xml.length} bytes`);
    
    // Debug: Output a sample of the generated XML to check template replacements
    if (showCount > 0) {
      console.log(`XML sample (first 500 characters): ${xml.substring(0, 500)}`);
    }
    
    return xml;
  } catch (error) {
    console.error("Error generating XML:", error);
    return `<?xml version="1.0" encoding="UTF-8"?><error>${error instanceof Error ? error.message : "Unknown error"}</error>`;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting XML generation process");
    
    // Get template from request if available
    let template = '';
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        template = body.template || '';
        console.log("Received template in request body, length:", template.length);
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
      const { data: templateData, error: templateError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'schedule_xml_template')
        .maybeSingle();
        
      if (!templateError && templateData && templateData.value) {
        template = templateData.value;
        console.log("Using template from database, length:", template.length);
      }
    }
    
    // Get today's date as starting point
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get schedule slots for the next two weeks
    console.log("Fetching schedule slots");
    const scheduleSlots = await getScheduleSlots(supabase, today);
    
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
    
    // Log a sample of enhanced slots to verify data
    if (enhancedSlots.length > 0) {
      console.log("Sample of enhanced slot data:", JSON.stringify(enhancedSlots[0], null, 2));
    }
    
    // Generate XML
    console.log("Generating XML from schedule slots");
    const xml = generateScheduleXML(enhancedSlots, template);
    
    // Store the generated XML in Supabase
    console.log("Storing XML in system_settings");
    const { error: storageError } = await supabase
      .from('system_settings')
      .upsert({ 
        key: 'schedule_xml', 
        value: xml,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (storageError) {
      console.error("Error storing XML:", storageError);
      throw new Error(`Failed to store XML: ${storageError.message}`);
    } else {
      console.log("XML stored successfully");
    }
    
    // Return XML response
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error("Error generating schedule XML:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${error.message}</error>`,
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
        },
      }
    );
  }
});
