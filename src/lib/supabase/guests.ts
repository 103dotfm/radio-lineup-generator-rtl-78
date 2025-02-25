
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('searchGuests: Starting search with query:', query);
  
  try {
    console.log('searchGuests: Building query for:', query);
    const { data, error } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .eq('is_break', false)
      .eq('is_note', false)
      .limit(5);

    if (error) {
      console.error('searchGuests: Database error:', error.message);
      throw error;
    }

    console.log('searchGuests: Raw results:', data);
    
    // Add more specific logging about the results
    if (data && data.length > 0) {
      console.log('searchGuests: Found matches:', data.length);
      data.forEach((item, index) => {
        console.log(`searchGuests: Match ${index + 1}:`, {
          name: item.name,
          title: item.title,
          matchType: item.name.toLowerCase().includes(query.toLowerCase()) ? 'name' : 'title'
        });
      });
    } else {
      console.log('searchGuests: No matches found');
    }

    return data || [];
    
  } catch (error) {
    console.error('searchGuests: Unexpected error:', error);
    throw error;
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  return;
};
