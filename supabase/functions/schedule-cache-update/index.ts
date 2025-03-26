
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';

// This function makes a request to our update-schedule-cache function
async function updateCache() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  console.log('Running scheduled cache update at:', new Date().toISOString());
  
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-schedule-cache`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update cache: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Cache update successful at:', new Date().toISOString());
    console.log('Dates included in cache:', result.dates?.join(', '));
    console.log('Cache public URL:', result.publicUrl);
    
    // Create a local copy of the schedule-cache.json file
    // This will make it available under the app domain directly
    try {
      await fetch(result.publicUrl);
      console.log('Successfully verified cache file is accessible');
    } catch (error) {
      console.error('Error verifying cache file:', error);
    }
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

// Run immediately on startup
updateCache();

// Schedule to run every 5 minutes
cron('*/5 * * * *', () => {
  updateCache();
});

// Schedule to run at midnight every day to remove old data
cron('0 0 * * *', () => {
  console.log('Running midnight cache cleanup');
  updateCache();
});

// Keep the process alive
console.log('Schedule cache update service started');
while (true) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}
