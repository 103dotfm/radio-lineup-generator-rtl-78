
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the Supabase URL from environment variables or client
export const getStorageUrl = () => {
  // Using the Supabase URL from the client
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yyrmodgbnzqbmatlypuc.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/lovable`;
};

// Helper function to check if storage bucket exists and create it if it doesn't
export const ensureStorageBucket = async () => {
  try {
    // Check if lovable bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'lovable');
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket('lovable', {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
      });
      
      if (createError) {
        console.error("Error creating bucket:", createError);
        return false;
      }
      
      console.log("Created lovable storage bucket");
    }
    
    return true;
  } catch (error) {
    console.error("Error in ensureStorageBucket:", error);
    return false;
  }
};
