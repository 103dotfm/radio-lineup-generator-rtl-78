
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Helper for direct storage operations
export const getStorageUrl = (path: string) => {
  return `https://yyrmodgbnzqbmatlypuc.supabase.co/storage/v1/object/public/lovable/${path}`;
};
