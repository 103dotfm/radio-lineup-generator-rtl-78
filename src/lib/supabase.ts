
import { supabase as supabaseClient } from '@/integrations/supabase/client';

export const supabase = supabaseClient;

// Helper for direct storage operations
export const getStorageUrl = (path: string) => {
  // Use local server URL instead of Supabase storage
  return `/uploads/${path}`;
};

// Helper to generate a file path for work arrangements
export const generateWorkArrangementPath = (fileType: string, weekStartStr: string, filename: string) => {
  return `work-arrangements/${fileType}/${weekStartStr}/${filename}`;
};
