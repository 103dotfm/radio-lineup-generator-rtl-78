
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8'
};

// Function to generate XML format from schedule data
function generateScheduleXML(slots) {
  const today = new Date();
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Start building XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<schedule generated="' + new Date().toISOString() + '">\n';
  
  // Sort slots by day_of_week and start_time
  const sortedSlots = [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.start_time.localeCompare(b.start_time);
  });
  
  // Group slots by day
  const slotsByDay = {};
  for (let i = 0; i < 7; i++) {
    slotsByDay[i] = [];
  }
  
  sortedSlots.forEach(slot => {
    if (!slot.is_deleted && slot.day_of_week >= 0 && slot.day_of_week <= 6) {
      slotsByDay[slot.day_of_week].push(slot);
    }
  });
  
  // Add each day to XML
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    // Calculate the date for this day of the week
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - today.getDay() + dayIndex);
    
    xml += `  <day index="${dayIndex}" date="${formatDate(dayDate)}">\n`;
    
    // Add shows for this day
    slotsByDay[dayIndex].forEach(slot => {
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
}

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
        auth: { persistSession: false }
      }
    );

    // Get the current week's schedule
    const { data: slots, error } = await supabaseClient
      .from('schedule_slots_old')
      .select('*')
      .or('is_recurring.eq.true,is_deleted.eq.false')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedule slots:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedule data' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate XML from the slots data
    const xml = generateScheduleXML(slots);
    
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
