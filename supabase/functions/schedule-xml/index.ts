
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";
import { format, addDays, startOfWeek, parse } from "https://esm.sh/date-fns@3.3.0";

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8'
};

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Function to generate the weekly schedule XML
async function generateWeeklyScheduleXML(supabaseClient, date = new Date()) {
  try {
    // Calculate the start date of the week
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    console.log(`Generating schedule for week starting: ${format(weekStart, 'yyyy-MM-dd')}`);
    
    // Process schedule slots using same logic as dashboard
    const processedSchedule = await processScheduleForWeek(supabaseClient, weekStart);
    
    // Start building XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<schedule generated="${new Date().toISOString()}" weekStart="${format(weekStart, 'yyyy-MM-dd')}">\n`;
    
    // Add each day to XML
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      // Calculate the date for this day of the week
      const dayDate = addDays(weekStart, dayIndex);
      const formattedDate = format(dayDate, 'yyyy-MM-dd');
      
      xml += `  <day index="${dayIndex}" date="${formattedDate}">\n`;
      
      // Get slots for this day
      const daySlots = processedSchedule.filter(slot => slot.day_of_week === dayIndex);
      
      // Sort slots by start time
      const sortedSlots = daySlots.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
      });
      
      // Add shows for this day
      sortedSlots.forEach(slot => {
        xml += '    <show>\n';
        xml += `      <title>${escapeXml(slot.show_name || '')}</title>\n`;
        xml += `      <host>${escapeXml(slot.host_name || '')}</host>\n`;
        xml += `      <startTime>${slot.start_time || ''}</startTime>\n`;
        xml += `      <endTime>${slot.end_time || ''}</endTime>\n`;
        xml += `      <isPrerecorded>${slot.is_prerecorded ? 'true' : 'false'}</isPrerecorded>\n`;
        xml += `      <isCollection>${slot.is_collection ? 'true' : 'false'}</isCollection>\n`;
        xml += '    </show>\n';
      });
      
      xml += '  </day>\n';
    }
    
    xml += '</schedule>';
    return xml;
  } catch (error) {
    console.error('Error generating XML:', error);
    throw error;
  }
}

// Process schedule slots for a specific week, following the same logic as the dashboard
async function processScheduleForWeek(supabaseClient, weekStart) {
  try {
    // Get all slots (recurring and non-recurring)
    const { data: allSlots, error } = await supabaseClient
      .from('schedule_slots_old')
      .select('*')
      .or('is_recurring.eq.true,is_recurring.eq.false')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    console.log(`Retrieved ${allSlots.length} slots from database`);
    
    // Format week start for comparison
    const formattedWeekStart = format(weekStart, 'yyyy-MM-dd');
    
    // Process slots using the same logic as the dashboard
    const processedSlots = [];
    
    for (const slot of allSlots) {
      // For non-recurring slots
      if (!slot.is_recurring) {
        // Check if this modification belongs to the current week we're viewing
        const slotCreationDate = startOfWeek(new Date(slot.created_at), { weekStartsOn: 0 });
        const slotWeekStart = format(slotCreationDate, 'yyyy-MM-dd');
        
        if (slotWeekStart === formattedWeekStart) {
          if (!slot.is_deleted) {
            processedSlots.push({
              ...slot,
              is_modified: true
            });
          }
        }
        continue;
      }
      
      // For recurring slots, check for modifications in the current week
      const weekModification = allSlots.find(s => 
        !s.is_recurring && 
        s.day_of_week === slot.day_of_week && 
        s.start_time === slot.start_time &&
        format(startOfWeek(new Date(s.created_at), { weekStartsOn: 0 }), 'yyyy-MM-dd') === formattedWeekStart
      );
      
      if (weekModification) {
        // If there's a modification and it's not deleted, add the modified version
        if (!weekModification.is_deleted) {
          processedSlots.push({
            ...weekModification,
            is_modified: true
          });
        }
      } else {
        // Add the recurring slot if no modifications exist and it was created before this week
        const slotCreationDate = new Date(slot.created_at);
        const weekEndDate = addDays(weekStart, 7);
        
        if (slotCreationDate < weekEndDate) {
          processedSlots.push({
            ...slot,
            is_modified: false
          });
        }
      }
    }
    
    console.log(`Processed ${processedSlots.length} slots for the week of ${formattedWeekStart}`);
    return processedSlots;
  } catch (error) {
    console.error('Error processing schedule for week:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request for potential query parameters
    const url = new URL(req.url);
    let weekDateParam = url.searchParams.get('date');
    let selectedDate;
    
    if (weekDateParam) {
      try {
        // Parse the date parameter if provided
        selectedDate = parse(weekDateParam, 'yyyy-MM-dd', new Date());
      } catch (error) {
        console.error('Invalid date parameter:', error);
        selectedDate = new Date();
      }
    } else {
      // Use current date if no parameter provided
      selectedDate = new Date();
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
        auth: { persistSession: false }
      }
    );

    // Generate XML from the schedule data
    const xml = await generateWeeklyScheduleXML(supabaseClient, selectedDate);
    
    // Return the XML response
    return new Response(xml, { headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
