
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process schedule data and create a structured cache
function processScheduleData(shows, slots) {
  // Create an object to organize shows by date
  const scheduleByDate = {};

  // First, add existing shows from the shows table
  shows.forEach(show => {
    if (!show.date) return;
    
    if (!scheduleByDate[show.date]) {
      scheduleByDate[show.date] = [];
    }
    
    scheduleByDate[show.date].push({
      id: show.id,
      name: show.name,
      time: show.time,
      hasLineup: true,
      slotId: show.slot_id || null
    });
  });

  // Then, add recurring slots for upcoming dates
  const today = new Date();
  const daysToGenerate = 21; // Generate schedule for the next 3 weeks
  
  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    // Find slots for this day of week
    const slotsForDay = slots.filter(slot => slot.day_of_week === dayOfWeek && !slot.is_deleted);
    
    if (!scheduleByDate[formattedDate]) {
      scheduleByDate[formattedDate] = [];
    }
    
    // Add slots that don't already exist as shows
    slotsForDay.forEach(slot => {
      // Check if this slot is already represented by a show
      const existingShow = scheduleByDate[formattedDate].find(
        show => show.time === slot.start_time && show.slotId === slot.id
      );
      
      if (!existingShow) {
        scheduleByDate[formattedDate].push({
          id: slot.id,
          name: slot.host_name && slot.host_name !== slot.show_name 
            ? `${slot.show_name} עם ${slot.host_name}`
            : slot.show_name,
          time: slot.start_time,
          hasLineup: slot.has_lineup || false,
          slotId: slot.id
        });
      }
    });
    
    // Sort shows by time
    scheduleByDate[formattedDate].sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  }
  
  return scheduleByDate;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log('Starting schedule cache update process');
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch shows from the shows table
    console.log('Fetching shows data...');
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, time, date, slot_id');
      
    if (showsError) {
      console.error('Error fetching shows:', showsError);
      throw showsError;
    }
    
    // Fetch schedule slots
    console.log('Fetching schedule slots data...');
    const { data: slots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('id, show_name, host_name, day_of_week, start_time, has_lineup, is_deleted');
      
    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError);
      throw slotsError;
    }
    
    console.log(`Processing ${shows.length} shows and ${slots.length} schedule slots`);
    
    // Process the data to create the cache
    const scheduleCache = processScheduleData(shows, slots);
    
    // Store the cache in Supabase storage or database
    const cacheData = JSON.stringify(scheduleCache);
    
    // Option 1: Store in database as a system setting (as fallback)
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
      throw upsertError;
    }
    
    // Option 2: Store in Supabase Storage as a physical JSON file
    console.log('Uploading cache to storage...');
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('public')
      .upload('schedule-cache.json', new Blob([cacheData], { type: 'application/json' }), {
        cacheControl: '3600',
        upsert: true
      });
    
    if (storageError) {
      console.error('Error storing cache in storage:', storageError);
      console.log('Will rely on database cache as fallback');
    } else {
      console.log('Cache file uploaded to storage successfully');
      
      // Create a public URL for the cache file
      const { data: publicUrlData } = await supabase.storage.from('public').getPublicUrl('schedule-cache.json');
      console.log('Cache file public URL:', publicUrlData?.publicUrl);
    }
    
    // Make a copy in the public directory
    try {
      console.log('Writing cache to public directory');
      await Deno.mkdir('./public', { recursive: true });
      await Deno.writeTextFile('./public/schedule-cache.json', cacheData);
      console.log('Successfully wrote cache to public directory');
    } catch (dirError) {
      console.error('Error creating directory or writing file:', dirError);
    }
    
    // Create a sample JSON file in the public directory as a fallback
    // This ensures that there's always a valid JSON file even if uploads fail
    try {
      const today = new Date();
      const sampleCache = {};
      
      for (let i = 0; i < 21; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Sample data for each day
        sampleCache[formattedDate] = [
          {
            id: `sample-morning-${i}`,
            name: "תכנית בוקר",
            time: "08:00",
            hasLineup: true,
            slotId: "morning-slot"
          },
          {
            id: `sample-noon-${i}`,
            name: "תכנית צהריים עם מנחה",
            time: "12:00",
            hasLineup: true,
            slotId: "noon-slot"
          },
          {
            id: `sample-evening-${i}`,
            name: "תכנית ערב",
            time: "18:00",
            hasLineup: true,
            slotId: "evening-slot"
          }
        ];
      }
      
      const sampleCacheData = JSON.stringify(sampleCache);
      await Deno.writeTextFile('./public/schedule-cache-sample.json', sampleCacheData);
      console.log('Successfully wrote sample cache to public directory');
    } catch (sampleError) {
      console.error('Error creating sample cache file:', sampleError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString()
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
