import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';

// This function makes a request to our update-schedule-cache function every 10 minutes
async function updateCache() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  
  console.log(`Running scheduled cache update at ${new Date().toISOString()}...`);
  
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-schedule-cache`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ timestamp: Date.now() })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update cache: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Cache update result:', result);
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

// Run immediately on startup
console.log(`Starting schedule cache update service at ${new Date().toISOString()}`);
updateCache();

// Schedule to run every 10 minutes
cron('*/10 * * * *', () => {
  updateCache();
});

// Keep the process alive
console.log('Schedule cache update service running...');
while (true) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}
