
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate schedule data for the next 3 weeks
function generateScheduleData() {
  const scheduleByDate = {};
  const today = new Date();
  
  // Generate for 21 days (3 weeks)
  for (let i = 0; i < 21; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
    
    scheduleByDate[formattedDate] = [
      {
        id: `morning-${i}-1`,
        name: "שבע תשע עם ענת דוידוב וטל שלו",
        time: "07:00",
        hasLineup: true,
        slotId: "morning-slot-1"
      },
      {
        id: `morning-${i}-2`,
        name: "בן כספית וינון מגל",
        time: "09:00",
        hasLineup: true,
        slotId: "morning-slot-2"
      },
      {
        id: `noon-${i}-1`,
        name: "אראל סג\"ל ואייל ברקוביץ'",
        time: "11:00",
        hasLineup: true,
        slotId: "noon-slot-1"
      },
      {
        id: `noon-${i}-2`,
        name: "חמש עם אריה אלדד ויריב אופנהיימר",
        time: "17:00",
        hasLineup: true,
        slotId: "afternoon-slot-1"
      },
      {
        id: `evening-${i}-1`,
        name: "איריס קול",
        time: "21:00",
        hasLineup: true,
        slotId: "evening-slot-1"
      }
    ];
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
    
    // Generate the schedule data
    const scheduleCache = generateScheduleData();
    const cacheData = JSON.stringify(scheduleCache);
    
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
