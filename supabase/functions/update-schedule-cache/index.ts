
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate schedule data from the actual schedule slots
async function generateScheduleData() {
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Fetching all schedule slots...');
  
  // Get all schedule slots (not just ones with lineups)
  const { data: scheduleSlots, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('is_deleted', false)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching schedule slots:', error);
    throw error;
  }
  
  console.log(`Retrieved ${scheduleSlots.length} schedule slots`);
  
  // Generate dates for the next 21 days, starting from today
  const scheduleByDate = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  console.log(`Generating schedule starting from ${today.toISOString()}`);
  
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    console.log(`Processing day ${formattedDate}, day of week ${dayOfWeek}`);
    
    // Get all slots for this day of week
    const slotsForThisDay = scheduleSlots.filter(slot => {
      return slot.day_of_week === dayOfWeek;
    });
    
    console.log(`Found ${slotsForThisDay.length} slots for day ${formattedDate}`);
    
    // Sort by time and transform to required format (only name and time)
    if (slotsForThisDay.length > 0) {
      scheduleByDate[formattedDate] = slotsForThisDay
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(slot => {
          // Extract just the time part (HH:MM:SS) and convert to HH:MM format
          const timeString = slot.start_time.split(':').slice(0, 2).join(':');
          
          return {
            name: slot.show_name,
            time: timeString
          };
        });
    } else {
      // Ensure we always have an entry for each date, even if empty
      scheduleByDate[formattedDate] = [];
    }
  }
  
  return scheduleByDate;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log(`Starting schedule cache update process at ${new Date().toISOString()}`);
    
    // Generate the schedule data from the actual schedule
    const scheduleCache = await generateScheduleData();
    const cacheData = JSON.stringify(scheduleCache);
    
    // Create Supabase client to store in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store in database as a system setting for fallback
    console.log('Storing cache in system_settings table...');
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        { 
          key: 'schedule_cache', 
          value: cacheData,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );
      
    if (upsertError) {
      console.error('Error storing cache in database:', upsertError);
      // Continue with file writing even if DB update fails
    }
    
    // Write directly to the public directory
    try {
      console.log('Writing cache to public directory...');
      await Deno.mkdir('./public', { recursive: true });
      const filePath = './public/schedule-cache.json';
      await Deno.writeTextFile(filePath, cacheData);
      
      // Verify the file was written correctly
      try {
        const fileContent = await Deno.readTextFile(filePath);
        const fileSize = fileContent.length;
        console.log(`Successfully wrote cache to ${filePath} (${fileSize} bytes)`);
      } catch (readError) {
        console.error('Error verifying written file:', readError);
      }
    } catch (dirError) {
      console.error('Error creating directory or writing file:', dirError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString(),
        dates: Object.keys(scheduleCache).length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error updating schedule cache:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
