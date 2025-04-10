
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

// Directly insert work arrangement record without file upload
export const saveWorkArrangement = async (
  filename: string, 
  url: string, 
  type: string, 
  weekStart: string
) => {
  try {
    const { data, error } = await supabase
      .from('work_arrangements')
      .insert({
        filename: filename,
        url: url,
        type: type,
        week_start: weekStart,
      })
      .select();
      
    if (error) {
      console.error("Error saving work arrangement:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Exception saving work arrangement:", error);
    return { success: false, error };
  }
};

