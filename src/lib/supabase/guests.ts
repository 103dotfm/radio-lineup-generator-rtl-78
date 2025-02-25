
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('[SEARCH] Starting search with query:', query);
  
  if (query.length < 2) {
    console.log('[SEARCH] Query too short, returning empty array');
    return [];
  }
  
  try {
    // Search by name
    const { data: nameMatches, error: nameError } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .ilike('name', `%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .limit(5);

    if (nameError) {
      console.error('[SEARCH] Database error for name search:', nameError);
      throw nameError;
    }

    // Search by title
    const { data: titleMatches, error: titleError } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .ilike('title', `%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .limit(5);

    if (titleError) {
      console.error('[SEARCH] Database error for title search:', titleError);
      throw titleError;
    }

    // Combine and deduplicate results
    const allMatches = [...(nameMatches || []), ...(titleMatches || [])];
    
    console.log('[SEARCH] Name matches:', nameMatches);
    console.log('[SEARCH] Title matches:', titleMatches);

    // Deduplicate based on both name and title to ensure exact matches
    const uniqueResults = allMatches.reduce((acc: any[], current) => {
      const exists = acc.find(item => 
        item.name === current.name && 
        item.title === current.title
      );
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, []).slice(0, 5);

    console.log('[SEARCH] Final unique results:', uniqueResults);
    return uniqueResults;
  } catch (error) {
    console.error('[SEARCH] Error in searchGuests:', error);
    throw error;
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  return;
};
