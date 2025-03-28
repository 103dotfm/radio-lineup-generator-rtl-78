
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
    
    // Directly query all slots for this specific day, joining both recurring and date-specific slots
    const { data: daySlots, error } = await supabase
      .rpc('get_daily_schedule_for_date', { target_date: formattedDate, target_day_of_week: dayOfWeek })
      .select('*')
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error(`Error fetching slots for date ${formattedDate}:`, error);
      // Create empty structure if we couldn't get data
      scheduleByDate[formattedDate] = createEmptyDaySchedule();
      continue;
    }
    
    console.log(`Retrieved ${daySlots?.length || 0} slots for date ${formattedDate}`);
    console.log('Sample slot data:', daySlots && daySlots.length > 0 ? JSON.stringify(daySlots[0]) : 'No slots');
    
    // Create structured hourly slots from 6:00 to 2:00
    const hourlySlots = [];
    const hours = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
      '22:00', '23:00', '00:00', '01:00', '02:00'
    ];
    
    // If we couldn't get day slots, create empty structure
    if (!daySlots || daySlots.length === 0) {
      scheduleByDate[formattedDate] = hours.map(hour => ({
        name: '',
        time: hour
      }));
      continue;
    }
    
    // Map slots to their corresponding hours
    for (const hour of hours) {
      // Find a slot that starts at this hour
      const matchingSlot = daySlots.find(slot => {
        const slotTime = slot.start_time.substring(0, 5); // Extract HH:MM part
        return slotTime === hour;
      });
      
      if (matchingSlot) {
        hourlySlots.push({
          name: matchingSlot.show_name || '',
          time: hour,
          host: matchingSlot.host_name || undefined
        });
      } else {
        // If no show starts at this hour, add an empty slot
        hourlySlots.push({
          name: '',
          time: hour
        });
      }
    }
    
    scheduleByDate[formattedDate] = hourlySlots;
  }
  
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
    
    // Create required directories if they don't exist
    try {
      await Deno.mkdir('./public', { recursive: true });
      console.log('Created public directory or confirmed it exists');
    } catch (mkdirError) {
      console.error('Error creating public directory:', mkdirError);
    }
    
    // Write to file using multiple methods for redundancy
    let fileWriteSuccess = false;
    const encoder = new TextEncoder();
    
    // Method 1: Using Deno.writeTextFile
    try {
      console.log('Writing cache to file (method 1)...');
      await Deno.writeTextFile('./public/schedule-cache.json', cacheData);
      console.log('Successfully wrote cache file using method 1');
      fileWriteSuccess = true;
    } catch (fileError1) {
      console.error('Error writing file (method 1):', fileError1);
      
      // Method 2: Using Deno.writeFile with encoder
      try {
        console.log('Trying alternative file writing method (method 2)...');
        await Deno.writeFile('./public/schedule-cache.json', encoder.encode(cacheData));
        console.log('Successfully wrote cache file using method 2');
        fileWriteSuccess = true;
      } catch (fileError2) {
        console.error('Error writing file (method 2):', fileError2);
        
        // Method 3: Using file handle
        try {
          console.log('Trying final file writing method (method 3)...');
          const filePath = './public/schedule-cache.json';
          const file = await Deno.open(filePath, { write: true, create: true, truncate: true });
          await file.write(encoder.encode(cacheData));
          file.close();
          console.log('Successfully wrote cache file using method 3');
          fileWriteSuccess = true;
        } catch (fileError3) {
          console.error('All file writing methods failed:', fileError3);
        }
      }
    }
    
    // Attempt to verify the file was written correctly
    try {
      const fileContent = await Deno.readTextFile('./public/schedule-cache.json');
      console.log(`Verification: Read file with size ${fileContent.length} bytes`);
    } catch (readError) {
      console.error('Error verifying file was written:', readError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString(),
        days: Object.keys(scheduleCache).length,
        fileWriteSuccess: fileWriteSuccess,
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
