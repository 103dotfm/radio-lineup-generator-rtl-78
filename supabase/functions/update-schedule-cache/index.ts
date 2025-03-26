
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
  
  // Get all schedule slots
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
  
  // Generate dates for the next 21 days
  const scheduleByDate = {};
  const today = new Date();
  
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    // Get all slots for this day of week
    const slotsForThisDay = scheduleSlots.filter(slot => slot.day_of_week === dayOfWeek);
    
    if (slotsForThisDay.length > 0) {
      scheduleByDate[formattedDate] = slotsForThisDay.map(slot => {
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
  
  // Check for any weekly modifications in the next 21 days
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get the weekly modifications for this date
    const { data: modifications, error: modError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('is_recurring', false)
      .eq('is_deleted', false)
      .gte('created_at', date.toISOString().split('T')[0]);
    
    if (modError) {
      console.error('Error fetching schedule modifications:', modError);
      continue; // Skip this date if there's an error
    }
    
    // Apply modifications for this date if any
    if (modifications && modifications.length > 0) {
      const dayOfWeek = date.getDay();
      const modsForThisDay = modifications.filter(mod => mod.day_of_week === dayOfWeek);
      
      if (modsForThisDay.length > 0) {
        // For each modification, add or update the corresponding show
        modsForThisDay.forEach(mod => {
          const timeString = mod.start_time.split(':').slice(0, 2).join(':');
          
          // Check if we need to add or update
          const existingIndex = scheduleByDate[formattedDate].findIndex(
            show => show.time === timeString
          );
          
          if (existingIndex >= 0) {
            // Update existing show
            scheduleByDate[formattedDate][existingIndex] = {
              name: mod.show_name,
              time: timeString
            };
          } else {
            // Add new show
            scheduleByDate[formattedDate].push({
              name: mod.show_name,
              time: timeString
            });
            
            // Sort shows by time
            scheduleByDate[formattedDate].sort((a, b) => 
              a.time.localeCompare(b.time)
            );
          }
        });
      }
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
    console.log('Starting schedule cache update process');
    
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
      console.log('Writing cache to public directory');
      await Deno.mkdir('./public', { recursive: true });
      await Deno.writeTextFile('./public/schedule-cache.json', cacheData);
      console.log('Successfully wrote cache to public directory');
    } catch (dirError) {
      console.error('Error creating directory or writing file:', dirError);
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
