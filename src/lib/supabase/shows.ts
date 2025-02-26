import { supabase } from "@/integrations/supabase/client";
import { Show } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      *,
      items:show_items(
        *,
        interviewees(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }

  return shows || [];
};

export const searchShows = async (query: string): Promise<Show[]> => {
  console.log('Searching shows with query:', query);
  
  try {
    // First, get items that match the search query
    const { data: matchingItems, error: itemsError } = await supabase
      .from('show_items')
      .select('*, show:show_id(*)')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('Error searching items:', itemsError);
      return [];
    }

    // Transform the results into Show objects
    const shows = matchingItems?.reduce((acc: { [key: string]: Show }, item) => {
      if (!item.show) return acc;
      
      const showId = item.show.id;
      if (!acc[showId]) {
        // Initialize show if we haven't seen it before
        acc[showId] = {
          ...item.show,
          items: []
        };
      }
      
      // Add only the matching item to the show's items
      acc[showId].items = acc[showId].items || [];
      acc[showId].items.push({
        id: item.id,
        show_id: item.show_id,
        position: item.position,
        name: item.name,
        title: item.title,
        phone: item.phone,
        details: item.details,
        duration: item.duration,
        is_break: item.is_break,
        is_note: item.is_note,
        created_at: item.created_at
      });

      return acc;
    }, {});

    console.log('Search results:', Object.values(shows));
    return Object.values(shows) || [];

  } catch (error) {
    console.error('Error searching shows:', error);
    return [];
  }
};

export const deleteShow = async (showId: string) => {
  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', showId);

  if (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};
