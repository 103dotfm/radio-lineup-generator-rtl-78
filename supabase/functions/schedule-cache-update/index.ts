import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';

// Create a directory if it doesn't exist
async function ensureDir(path) {
  try {
    const stat = await Deno.stat(path);
    if (!stat.isDirectory) {
      throw new Error(`Path exists but is not a directory: ${path}`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(path, { recursive: true });
    } else {
      throw error;
    }
  }
}

// Write the cache to a local file
async function writeToLocalFile(data, filename) {
  try {
    // Ensure the public directory exists
    await ensureDir("./public");
    
    // Write the file to the public directory
    await Deno.writeTextFile(`./public/${filename}`, data);
    console.log(`Successfully wrote to ./public/${filename}`);
    
    return true;
  } catch (error) {
    console.error(`Error writing to local file: ${error.message}`);
    return false;
  }
}

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
    
    // Get the cache file from storage
    try {
      const cacheResponse = await fetch(result.publicUrl);
      
      if (!cacheResponse.ok) {
        throw new Error(`Failed to fetch cache file: ${cacheResponse.status}`);
      }
      
      const cacheData = await cacheResponse.text();
      
      // Write the cache file to the public directory in this service
      const writeSuccess = await writeToLocalFile(cacheData, 'schedule-cache.json');
      
      if (writeSuccess) {
        console.log('Successfully wrote cache file to public directory');
      } else {
        console.error('Failed to write cache file to public directory');
      }
    } catch (error) {
      console.error('Error copying cache file to public directory:', error);
    }
  } catch (error) {
    console.error('Error updating cache:', error);
  }
}

// Run immediately on startup
updateCache();

// Schedule to run every hour (not too frequent to avoid overwhelming the system)
cron('0 * * * *', () => {
  console.log('Running hourly cache update');
  updateCache();
});

// Schedule to run at midnight every day to remove old data
cron('0 0 * * *', () => {
  console.log('Running midnight cache cleanup');
  updateCache();
});

// Keep the process alive
console.log('Schedule cache update service started');
Deno.serve(() => new Response("Schedule cache update service is running"));
