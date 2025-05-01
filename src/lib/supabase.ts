
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the storage URL from environment variables or configuration
export const getStorageUrl = () => {
  // Using the storage URL from environment variables if available
  // Otherwise, fallback to the default Supabase URL
  const storageUrl = import.meta.env.VITE_STORAGE_URL || 
                     import.meta.env.VITE_SUPABASE_URL ? 
                     `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/lovable` : 
                     'http://localhost:8080/storage/lovable';
                     
  return storageUrl;
};

// Check if a file exists in the specified path
export const checkFileExists = async (path: string) => {
  try {
    // If using custom storage implementation
    if (import.meta.env.VITE_STORAGE_URL) {
      const response = await fetch(`${import.meta.env.VITE_STORAGE_URL}/check/${path}`);
      return response.ok;
    }
    
    // Default Supabase implementation
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

// Helper to get WhatsApp number formatting
export const formatWhatsAppNumber = (phoneNumber: string): string => {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number starts with a plus if it doesn't already
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

