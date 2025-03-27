
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct implementation with focus on simplicity and reliability
async function generateScheduleData() {
  console.log('Starting schedule data generation...');
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Fetching all schedule slots...');
  
  // Get all schedule slots
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
  
  console.log(`Retrieved ${scheduleSlots?.length || 0} schedule slots`);
  
  // Generate dates for the next 14 days, starting from today
  const scheduleByDate = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  console.log(`Generating schedule starting from ${today.toISOString()}`);
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    console.log(`Processing day ${formattedDate}, day of week ${dayOfWeek}`);
    
    // Get all slots for this day of week
    const slotsForThisDay = scheduleSlots?.filter(slot => slot.day_of_week === dayOfWeek) || [];
    
    console.log(`Found ${slotsForThisDay.length} slots for day ${formattedDate}`);
    
    // Format and add to result
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
    
    // Generate the schedule data
    const scheduleCache = await generateScheduleData();
    const cacheData = JSON.stringify(scheduleCache, null, 2);
    
    console.log('Schedule data generated successfully');
    console.log(`Generated data for ${Object.keys(scheduleCache).length} days`);
    
    // Create Supabase client to store in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store in database as a system setting
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
    
    // Direct file writing method - first approach
    try {
      console.log('Writing cache to public directory (method 1)...');
      const encoder = new TextEncoder();
      await Deno.writeFile('./public/schedule-cache.json', encoder.encode(cacheData));
      console.log('Successfully wrote cache file using method 1');
    } catch (fileError1) {
      console.error('Error writing file (method 1):', fileError1);
      
      // Try alternative method
      try {
        console.log('Trying alternative file writing method (method 2)...');
        await Deno.mkdir('./public', { recursive: true });
        await Deno.writeTextFile('./public/schedule-cache.json', cacheData);
        console.log('Successfully wrote cache file using method 2');
      } catch (fileError2) {
        console.error('Error writing file (method 2):', fileError2);
        
        // Try a third method
        try {
          console.log('Trying final file writing method (method 3)...');
          const filePath = './public/schedule-cache.json';
          const file = await Deno.open(filePath, { write: true, create: true, truncate: true });
          await file.write(encoder.encode(cacheData));
          file.close();
          console.log('Successfully wrote cache file using method 3');
        } catch (fileError3) {
          console.error('All file writing methods failed:', fileError3);
        }
      }
    }
    
    // Attempt to verify the file was written correctly
    try {
      const fileContent = await Deno.readTextFile('./public/schedule-cache.json');
      const fileSize = fileContent.length;
      console.log(`File verification: Successfully read cache file (${fileSize} bytes)`);
      console.log(`First 100 characters: ${fileContent.substring(0, 100)}...`);
    } catch (readError) {
      console.error('Error verifying file was written:', readError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString(),
        days: Object.keys(scheduleCache).length,
        firstDay: Object.keys(scheduleCache)[0],
        entriesInFirstDay: scheduleCache[Object.keys(scheduleCache)[0]]?.length || 0
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
