import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('Searching for guests with query:', query);
  
  try {
    const { data, error } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .ilike('name', `%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .order('created_at', { ascending: false })
      .limit(20);

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
    }, [])
    .slice(0, 5); // Only return top 5 results

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