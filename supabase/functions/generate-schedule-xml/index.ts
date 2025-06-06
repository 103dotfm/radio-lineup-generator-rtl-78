
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

// Get schedule slots for the next two weeks, starting from today (with offset), focusing on non-recurring slots first
async function getScheduleSlots(supabase: any, startDate: Date) {
  try {
    // Calculate the end date (2 weeks from start)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    console.log(`Fetching schedule from ${startDateStr} to ${endDateStr}`);
    
    // Get all slots (both recurring and non-recurring)
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
      `);
    
    if (error) {
      console.error("Error fetching slots:", error);
      throw new Error(`Failed to fetch schedule slots: ${error.message}`);
    }
    
    console.log(`Retrieved ${slots ? slots.length : 0} raw slots from database`);
    
    // Process slots to match dashboard logic – always starting from TODAY with offset
    const processedSlots = [];
    const currentDate = new Date(startDate);
    const processedDaySlots = new Map(); // Track processed slots by day and time
    
    while (currentDate <= endDate) {
      const currentDayOfWeek = currentDate.getDay();
      const currentDateStr = formatDate(currentDate);
      
      // First, find any non-recurring slots for this specific date
      // These override recurring slots
      const nonRecurringSlots = slots.filter(slot => 
        !slot.is_recurring && 
        !slot.is_deleted &&
        formatDate(new Date(slot.created_at)) === currentDateStr &&
        slot.day_of_week === currentDayOfWeek
      );
      
      // Process non-recurring slots first (highest priority)
      for (const slot of nonRecurringSlots) {
        // Skip slots with red color
        if (slot.color && slot.color.trim().toLowerCase() === "red") {
          continue;
        }
        
        const key = `${currentDateStr}_${slot.start_time}`;
        const displayInfo = getShowDisplay(slot.show_name, slot.host_name);
        
        processedSlots.push({
          ...slot,
          date: currentDateStr,
          actualDate: new Date(currentDate),
          displayName: displayInfo.displayName,
          displayHost: displayInfo.displayHost,
          combinedDisplay: getCombinedShowDisplay(slot.show_name, slot.host_name)
        });
        
        // Mark this time slot as processed for this day
        processedDaySlots.set(key, true);
      }
      
      // Now process recurring slots for any time slots not already filled
      const recurringSlots = slots.filter(slot => 
        slot.is_recurring && 
        !slot.is_deleted &&
        slot.day_of_week === currentDayOfWeek
      );
      
      for (const slot of recurringSlots) {
        const key = `${currentDateStr}_${slot.start_time}`;
        
        // Skip if we already processed a non-recurring slot for this time
        if (processedDaySlots.has(key)) {
          continue;
        }
        
        // Skip slots with red color
        if (slot.color && slot.color.trim().toLowerCase() === "red") {
          continue;
        }
        
        const displayInfo = getShowDisplay(slot.show_name, slot.host_name);
        
        processedSlots.push({
          ...slot,
          date: currentDateStr,
          actualDate: new Date(currentDate),
          displayName: displayInfo.displayName,
          displayHost: displayInfo.displayHost,
          combinedDisplay: getCombinedShowDisplay(slot.show_name, slot.host_name)
        });
      }
      
      // Move to next day
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
      
      // Process the show template for this slot
      const processedShow = processTemplate(showTemplate, slot);
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
        .eq('key', 'schedule_xml_template')
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
    
    // Generate XML
    console.log("Generating XML from schedule slots");
    const xml = generateScheduleXML(scheduleSlots, template);
    
    // If not previewing, store the generated XML
    if (previewOffset === undefined) {
      console.log("Storing XML in system_settings");
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml', 
          value: xml,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }
    
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
