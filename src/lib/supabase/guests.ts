
import { supabase } from "@/integrations/supabase/client";

export const searchGuests = async (query: string) => {
  console.log('Searching for guests with query:', query);
  
  if (query.length < 2) return [];
  
  try {
    // Get items that might match
    const { data, error } = await supabase
      .from('show_items')
      .select('*')
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true);

    if (error) {
      console.error('Error searching guests:', error);
      return [];
    }

    console.log('Raw data before filtering:', data);

    // Strict filtering to only include items where name or title contains the query
    const queryLower = query.toLowerCase();
    const filteredResults = data?.filter(item => {
      const nameMatches = item.name?.toLowerCase().includes(queryLower);
      const titleMatches = item.title?.toLowerCase().includes(queryLower);
      console.log(`Checking item: "${item.name}" (${nameMatches}) / "${item.title}" (${titleMatches}) against query: "${queryLower}"`);
      return nameMatches || titleMatches;
    }) || [];

    console.log('Filtered results:', filteredResults);

    // Remove duplicates based on name
    const uniqueResults = filteredResults.reduce((acc: any[], current) => {
      const exists = acc.find(item => item.name === current.name);
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, [])
    .slice(0, 5); // Only return top 5 results

    console.log('Final unique results:', uniqueResults);
    return uniqueResults;
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
