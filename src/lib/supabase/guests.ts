
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('Searching for guests with query:', query);
  
  if (query.length < 2) return [];
  
  try {
    // Direct exact match on individual items only
    const { data, error } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .or(`name.ilike.%${query}%, title.ilike.%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .limit(5); // Limit directly in the query

    if (error) {
      console.error('Error searching guests:', error);
      return [];
    }

    // Remove duplicates based on name
    const uniqueGuests = data?.reduce((acc: any[], current) => {
      const exists = acc.find(item => item.name === current.name);
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, []);

    console.log('Search results:', uniqueGuests);
    return uniqueGuests || [];
  } catch (error) {
    console.error('Error searching guests:', error);
    return [];
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  // Since we're not using a separate guests table anymore, this function can be empty
  // or you might want to remove it entirely since guests are added directly to show_items
  return;
};
