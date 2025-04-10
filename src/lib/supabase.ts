
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the Supabase URL for storage
export const getStorageUrl = () => {
  // Use the exact URL format that worked in the manual test
  return 'https://yyrmodgbnzqbmatlypuc.supabase.co/storage/v1/object/public/lovable';
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
