
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { addDays, format, isAfter, isBefore, parseISO } from 'https://esm.sh/date-fns@3.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process schedule data and create a structured cache
function processScheduleData(shows, slots) {
  // Create an object to organize shows by date
  const scheduleByDate = {};
  const today = new Date();
  const threeWeeksLater = addDays(today, 21); // 3 weeks from today
  
  // Format today's date to match the cache format (YYYY-MM-DD)
  const formattedToday = format(today, 'yyyy-MM-dd');
  console.log('Processing schedule data from today:', formattedToday, 'to', format(threeWeeksLater, 'yyyy-MM-dd'));

  // First, add existing shows from the shows table (only if they're from today or in the future)
  shows.forEach(show => {
    if (!show.date) return;
    
    // Skip shows from before today
    const showDate = parseISO(show.date);
    if (isBefore(showDate, today) && format(showDate, 'yyyy-MM-dd') !== formattedToday) {
      return;
    }
    
    // Skip shows more than 3 weeks in the future
    if (isAfter(showDate, threeWeeksLater)) {
      return;
    }
    
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
  const daysToGenerate = 21; // Generate schedule for the next 3 weeks
  
  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = format(date, 'yyyy-MM-dd'); // YYYY-MM-DD
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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch shows from the shows table
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, name, time, date, slot_id');
      
    if (showsError) {
      console.error('Error fetching shows:', showsError);
      throw showsError;
    }
    
    // Fetch schedule slots
    const { data: slots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select('id, show_name, host_name, day_of_week, start_time, has_lineup, is_deleted');
      
    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError);
      throw slotsError;
    }
    
    // Process the data to create the cache
    const scheduleCache = processScheduleData(shows, slots);
    
    // Store the cache in Supabase storage or database
    const cacheData = JSON.stringify(scheduleCache);
    
    // Option 1: Store in database as a system setting (as fallback)
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
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('public')
      .upload('schedule-cache.json', new Blob([cacheData], { type: 'application/json' }), {
        cacheControl: '3600',
        upsert: true
      });
    
    // Generate a public URL for the file - we'll use this for direct access
    let publicUrl = '';
    if (!storageError) {
      console.log('Successfully stored cache in storage');
      
      // Get the public URL of the cache file from storage
      const { data: urlData } = await supabase
        .storage
        .from('public')
        .getPublicUrl('schedule-cache.json');
        
      publicUrl = urlData?.publicUrl || '';
      console.log('Storage cache file public URL:', publicUrl);
    } else {
      console.error('Error storing cache in storage:', storageError);
    }
    
    // Return success response with the public URL for reference
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Schedule cache updated successfully",
        timestamp: new Date().toISOString(),
        publicUrl: publicUrl,
        dates: Object.keys(scheduleCache)
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
