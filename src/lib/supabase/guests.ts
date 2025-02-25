
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('[SEARCH] Starting search with query:', query);
  
  if (query.length < 2) {
    console.log('[SEARCH] Query too short, returning empty array');
    return [];
  }
  
  try {
    // Use SQL ILIKE with proper wildcards
    const { data, error } = await supabase
      .from('show_items')
      .select('*')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .limit(5);

    if (error) {
      console.error('[SEARCH] Database error:', error);
      throw error;
    }

    if (!data) {
      console.log('[SEARCH] No data returned from database');
      return [];
    }

    console.log('[SEARCH] Raw results from database:', data);

    // No JavaScript filtering - trust the database query
    // Just deduplicate based on name if needed
    const uniqueResults = data.reduce((acc: any[], current) => {
      const exists = acc.find(item => item.name === current.name);
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, []);

    console.log('[SEARCH] Final unique results:', uniqueResults);
    return uniqueResults;
  } catch (error) {
    console.error('[SEARCH] Error in searchGuests:', error);
    throw error; // Let the error bubble up so we can see it in the UI
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  // Since we're not using a separate guests table anymore, this function can be empty
  // or you might want to remove it entirely since guests are added directly to show_items
  return;
};
