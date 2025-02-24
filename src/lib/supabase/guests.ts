
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('Searching for guests with query:', query);
  
  try {
    const { data, error } = await supabase
      .from('show_items')
      .select('name, title, phone, created_at')
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching guests:', error);
      return [];
    }

    // Convert query to lowercase and split into words for exact matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Very strict filtering that requires ALL query words to match EXACTLY
    const filteredData = data?.filter(item => {
      const nameWords = item.name.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      const titleWords = (item.title || '').toLowerCase().split(/\s+/).filter(word => word.length > 0);
      
      // Check if ALL query words appear in either name or title as complete words
      return queryWords.every(queryWord => 
        nameWords.includes(queryWord) || titleWords.includes(queryWord)
      );
    });
    
    // Remove duplicates based on name
    const uniqueGuests = filteredData?.reduce((acc: any[], current) => {
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
