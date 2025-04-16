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

// Get schedule slots for the next two weeks
async function getScheduleSlots(supabase: any, startDate: Date) {
  try {
    // Calculate the end date (2 weeks from start)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 14);
    
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    console.log(`Fetching schedule from ${startDateStr} to ${endDateStr}`);
    
    // Fetch the schedule data using the same logic as the frontend
    // This approach aligns with how the dashboard displays the schedule
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
    
    // Process slots to match the dashboard display logic
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startDate.getDate() - startDate.getDay()); // Get Sunday of current week
    
    // For each day in the 2-week period, process slots according to dashboard logic
    const processedSlots = [];
    const currentDate = new Date(startOfWeek);
    
    while (currentDate <= endDate) {
      const currentDayOfWeek = currentDate.getDay();
      const currentDateStr = formatDate(currentDate);
      
      // Process recurring slots
      for (const slot of slots) {
        // Skip if not applicable to current day
        if (slot.day_of_week !== currentDayOfWeek) continue;
        
        // Check for modifications or deletions for this specific week
        const matchingSlots = slots.filter(s => 
          s.day_of_week === slot.day_of_week && 
          s.start_time === slot.start_time
        );
        
        // If there's a non-recurring modification for current week
        const modification = matchingSlots.find(s => 
          !s.is_recurring && 
          new Date(s.created_at).getDay() === currentDayOfWeek
        );
        
        // Add the appropriate slot version to processed slots
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

// Generate XML from schedule data
function generateScheduleXML(scheduleSlots: any[]): string {
  try {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<schedule>\n';
    
    // Track seen shows to avoid duplicating 2-hour shows
    const seenShows = new Set();
    let showCount = 0;
    
    for (const slot of scheduleSlots) {
      // Create a unique identifier for this show instance
      const showKey = `${slot.date}_${slot.start_time}_${slot.show_name}_${slot.host_name}`;
      
      // Skip if we've already included this show
      if (seenShows.has(showKey)) continue;
      seenShows.add(showKey);
      
      xml += '  <show>\n';
      xml += `    <date>${slot.date}</date>\n`;
      xml += `    <start_time>${formatTime(slot.start_time)}</start_time>\n`;
      xml += `    <end_time>${formatTime(slot.end_time)}</end_time>\n`;
      xml += `    <name>${escapeXml(slot.show_name || '')}</name>\n`;
      xml += `    <host>${escapeXml(slot.host_name || '')}</host>\n`;
      xml += '  </show>\n';
      showCount++;
    }
    
    xml += '</schedule>';
    console.log(`Generated XML with ${showCount} shows, length: ${xml.length} bytes`);
    return xml;
  } catch (error) {
    console.error("Error generating XML:", error);
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Starting XML generation process");
    // Create Supabase client
    const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get today's date as starting point
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get schedule slots for the next two weeks
    console.log("Fetching schedule slots");
    const scheduleSlots = await getScheduleSlots(supabase, today);
    
    // Generate XML
    console.log("Generating XML from schedule slots");
    const xml = generateScheduleXML(scheduleSlots);
    
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
    
    // Return XML response with explicit headers
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store, max-age=0'
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
          'Cache-Control': 'no-store, max-age=0'
        },
      }
    );
  }
});
