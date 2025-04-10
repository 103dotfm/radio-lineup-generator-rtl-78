
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the Supabase URL from environment variables or client
export const getStorageUrl = () => {
  // Using the Supabase URL from the client
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yyrmodgbnzqbmatlypuc.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/lovable`;
};

// Instead of trying to create a bucket, we'll just check if a path exists
export const checkStoragePath = async (path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('lovable')
      .list(path);
    
    if (error) {
      console.error("Error checking storage path:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in checkStoragePath:", error);
    return false;
  }
};
