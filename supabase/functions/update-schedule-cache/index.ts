
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a daily schedule from 6am to 2am organized by date
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
  
  // Get all recurring schedule slots (the master schedule)
  const { data: scheduleSlots, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('is_recurring', true)
    .eq('is_deleted', false)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching schedule slots:', error);
    throw error;
  }
  
  console.log(`Retrieved ${scheduleSlots?.length || 0} recurring schedule slots`);
  
  // Get non-recurring schedule slots (week-specific modifications)
  const today = new Date();
  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - today.getDay()); // Get Sunday
  startOfCurrentWeek.setHours(0, 0, 0, 0);
  
  const endOfNextWeek = new Date(startOfCurrentWeek);
  endOfNextWeek.setDate(startOfCurrentWeek.getDate() + 14); // Two weeks of data
  
  console.log(`Getting non-recurring slots between ${startOfCurrentWeek.toISOString()} and ${endOfNextWeek.toISOString()}`);
  
  const { data: nonRecurringSlots, error: nonRecurringError } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('is_recurring', false)
    .eq('is_deleted', false)
    .gte('created_at', startOfCurrentWeek.toISOString())
    .lt('created_at', endOfNextWeek.toISOString())
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
    
  if (nonRecurringError) {
    console.error('Error fetching non-recurring slots:', nonRecurringError);
    // Continue with recurring slots only
  }
  
  console.log(`Retrieved ${nonRecurringSlots?.length || 0} non-recurring schedule slots`);
  
  // Also get deletion markers
  const { data: deletionMarkers, error: deletionError } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('is_recurring', false)
    .eq('is_deleted', true)
    .gte('created_at', startOfCurrentWeek.toISOString())
    .lt('created_at', endOfNextWeek.toISOString());
    
  if (deletionError) {
    console.error('Error fetching deletion markers:', deletionError);
    // Continue without deletion markers
  }
  
  console.log(`Retrieved ${deletionMarkers?.length || 0} deletion markers`);

  // Generate dates for the next 14 days, starting from today
  const scheduleByDate = {};
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    console.log(`Processing day ${formattedDate}, day of week ${dayOfWeek}`);
    
    // Create time slots from 6:00 to 2:00 (next day)
    const timeSlots = [];
    
    // First, collect all relevant slots for this day
    let daySlots = (scheduleSlots || [])
      .filter(slot => slot.day_of_week === dayOfWeek)
      .map(slot => ({ ...slot }));
    
    console.log(`Found ${daySlots.length} recurring slots for day ${formattedDate}`);
    
    // Apply non-recurring overrides and additions
    if (nonRecurringSlots && nonRecurringSlots.length > 0) {
      // Identify the start of the week for this date
      const dateObj = new Date(formattedDate);
      const startOfWeek = new Date(dateObj);
      startOfWeek.setDate(dateObj.getDate() - dateObj.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Find non-recurring slots created for this week and day
      const nonRecurringForThisDay = nonRecurringSlots.filter(slot => {
        const slotCreationDate = new Date(slot.created_at);
        const slotWeekStart = new Date(slotCreationDate);
        slotWeekStart.setDate(slotCreationDate.getDate() - slotCreationDate.getDay());
        slotWeekStart.setHours(0, 0, 0, 0);
        
        // Check if this non-recurring slot is for the current week and day
        return slot.day_of_week === dayOfWeek && 
               slotWeekStart.getTime() === startOfWeek.getTime();
      });
      
      console.log(`Found ${nonRecurringForThisDay.length} non-recurring slots for week starting ${startOfWeek.toISOString().split('T')[0]} and day ${dayOfWeek}`);
      
      // Find deletion markers for this week and day
      const deletionsForThisDay = (deletionMarkers || []).filter(slot => {
        const slotCreationDate = new Date(slot.created_at);
        const slotWeekStart = new Date(slotCreationDate);
        slotWeekStart.setDate(slotCreationDate.getDate() - slotCreationDate.getDay());
        slotWeekStart.setHours(0, 0, 0, 0);
        
        return slot.day_of_week === dayOfWeek && 
               slotWeekStart.getTime() === startOfWeek.getTime();
      });
      
      console.log(`Found ${deletionsForThisDay.length} deletion markers for this day`);
      
      // Apply deletions (remove slots that have deletion markers)
      if (deletionsForThisDay.length > 0) {
        const deletionTimes = deletionsForThisDay.map(d => d.start_time);
        daySlots = daySlots.filter(slot => !deletionTimes.includes(slot.start_time));
      }
      
      // Apply overrides and additions
      for (const nonRecurringSlot of nonRecurringForThisDay) {
        // Check if this is an override to an existing slot
        const existingIndex = daySlots.findIndex(s => s.start_time === nonRecurringSlot.start_time);
        
        if (existingIndex >= 0) {
          // Replace the existing slot with the non-recurring version
          daySlots[existingIndex] = nonRecurringSlot;
        } else {
          // Add as a new slot
          daySlots.push(nonRecurringSlot);
        }
      }
      
      // Sort by start time again after all modifications
      daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    
    // Create a structured schedule with all hours from 6:00 to 2:00
    const hours = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
      '22:00', '23:00', '00:00', '01:00', '02:00'
    ];
    
    for (const hour of hours) {
      // Find a show that starts at this hour
      const slot = daySlots.find(slot => {
        const slotHour = slot.start_time.substring(0, 5); // Extract HH:MM part
        return slotHour === hour;
      });
      
      if (slot) {
        timeSlots.push({
          name: slot.show_name,
          time: hour,
          host: slot.host_name || undefined
        });
      } else {
        // If no show starts at this hour, add an empty slot
        timeSlots.push({
          name: '',
          time: hour
        });
      }
    }
    
    scheduleByDate[formattedDate] = timeSlots;
    
    console.log(`Processed ${timeSlots.length} time slots for ${formattedDate}`);
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
      const fileSize = fileContent.length;
      console.log(`File verification: Successfully read cache file (${fileSize} bytes)`);
      
      // Validate JSON content
      const parsedContent = JSON.parse(fileContent);
      const dayCount = Object.keys(parsedContent).length;
      const firstDay = Object.keys(parsedContent)[0];
      console.log(`Verified JSON structure with ${dayCount} days, first day: ${firstDay}`);
      
      // Log first few entries for verification
      if (firstDay && parsedContent[firstDay]) {
        const entriesInFirstDay = parsedContent[firstDay].length;
        console.log(`First day (${firstDay}) has ${entriesInFirstDay} entries:`);
        if (entriesInFirstDay > 0) {
          console.log(JSON.stringify(parsedContent[firstDay].slice(0, 3), null, 2));
        }
      }
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
        firstDay: Object.keys(scheduleCache)[0],
        entriesInFirstDay: scheduleCache[Object.keys(scheduleCache)[0]]?.length || 0,
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
