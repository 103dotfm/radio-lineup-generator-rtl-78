
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Get the Supabase URL from window location if in browser environment
export const getStorageUrl = () => {
  // Using the Supabase URL from the client
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/lovable`;
};
