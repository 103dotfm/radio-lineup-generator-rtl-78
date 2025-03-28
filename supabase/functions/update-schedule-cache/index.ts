
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a daily schedule from 6am to 2am organized by date
async function generateScheduleData() {
  console.log('Starting schedule data generation with corrected approach...');
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Generate dates for the next 14 days, starting from today
  const today = new Date();
  const scheduleByDate = {};
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    console.log(`Processing date ${formattedDate}, day of week ${dayOfWeek}`);
    
    // Fetch the dashboard data directly - this should match what users see on their dashboard
    const { data: slotsByTime, error } = await supabase
      .from('schedule_slots')
      .select('show_name, start_time, host_name')
      .or(`and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek}),and(is_recurring.eq.false,date(created_at).eq.${formattedDate})`)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error(`Error fetching slots for date ${formattedDate}:`, error);
      scheduleByDate[formattedDate] = createEmptyDaySchedule();
      continue;
    }
    
    console.log(`Retrieved ${slotsByTime?.length || 0} slots for ${formattedDate}`);
    
    // Create structured hourly slots from 6:00 to 2:00
    const hours = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
      '22:00', '23:00', '00:00', '01:00', '02:00'
    ];
    
    // Map slots to their corresponding hours
    const hourlySlots = hours.map(hour => {
      // Find a slot that starts at this hour
      const matchingSlot = slotsByTime?.find(slot => {
        // Extract HH:MM part and compare
        const slotTime = slot.start_time ? slot.start_time.substring(0, 5) : null;
        return slotTime === hour;
      });
      
      if (matchingSlot) {
        console.log(`Found slot for ${hour}: ${matchingSlot.show_name}`);
        return {
          name: matchingSlot.show_name || '',
          time: hour,
          host: matchingSlot.host_name || undefined
        };
      } else {
        return {
          name: '',
          time: hour
        };
      }
    });
    
    scheduleByDate[formattedDate] = hourlySlots;
  }

  console.log('Schedule generation complete. Sample data:', 
    Object.keys(scheduleByDate).length > 0 ? 
    JSON.stringify(scheduleByDate[Object.keys(scheduleByDate)[0]]) : 'No data');
  
  return scheduleByDate;
}

// Create an empty daily schedule structure
function createEmptyDaySchedule() {
  const hours = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
    '22:00', '23:00', '00:00', '01:00', '02:00'
  ];
  
  return hours.map(hour => ({
    name: '',
    time: hour
  }));
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
    }
    
    // Ensure the public directory exists
    try {
      await Deno.mkdir('./public', { recursive: true });
      console.log('Created public directory or confirmed it exists');
    } catch (mkdirError) {
      console.error('Error creating public directory:', mkdirError);
    }
    
    // Write the file directly with high verbosity for debugging
    try {
      console.log('Writing cache to file...');
      console.log(`Cache data length: ${cacheData.length}`);
      
      // Log first day of cache data for debugging
      const firstDay = Object.keys(scheduleCache)[0];
      console.log(`First day in cache: ${firstDay}`);
      if (firstDay) {
        console.log(`Sample data for ${firstDay}:`, JSON.stringify(scheduleCache[firstDay].slice(0, 3)));
      }
      
      const encoder = new TextEncoder();
      const data = encoder.encode(cacheData);
      
      await Deno.writeFile('./public/schedule-cache.json', data);
      console.log('Successfully wrote cache file');
      
      // Verify the file was written
      try {
        const fileInfo = await Deno.stat('./public/schedule-cache.json');
        console.log(`Verified file exists with size: ${fileInfo.size} bytes`);
      } catch (statError) {
        console.error('Error verifying file:', statError);
      }
    } catch (fileError) {
      console.error('Error writing cache file:', fileError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString(),
        days: Object.keys(scheduleCache).length,
        format: "Structured by hour of day from 6:00 to 2:00"
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
