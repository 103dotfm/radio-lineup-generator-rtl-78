
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  try {
    // Single query using OR condition properly
    const { data, error } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .eq('is_break', false)
      .eq('is_note', false)
      .limit(5);

    if (error) {
      console.error('Search error:', error.message);
      throw error;
    }

    console.log('Search query:', query);
    console.log('Search results:', data);

    return data || [];
    
  } catch (error) {
    console.error('Unexpected error during search:', error);
    throw error;
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  return;
};
