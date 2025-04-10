
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the Supabase URL from environment variables or client
export const getStorageUrl = () => {
  // Using the Supabase URL from the client
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yyrmodgbnzqbmatlypuc.supabase.co';
  return `${supabaseUrl}/storage/v1/object/public/lovable`;
};

// Check if a file exists in the specified path
export const checkFileExists = async (path: string) => {
  try {
    const { data, error } = await supabase
      .storage
      .from('lovable')
      .download(path);
    
    if (error) {
      console.log("File doesn't exist:", path);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking file existence:", error);
    return false;
  }
};
