
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

export const getShowWithItems = async (showId: string) => {
  console.log('Fetching show with ID:', showId);
  
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single();

  if (showError) {
    console.error('Error fetching show:', showError);
    throw showError;
  }

  const { data: items, error: itemsError } = await supabase
    .from('show_items')
    .select(`
      *,
      interviewees(*)
    `)
    .eq('show_id', showId)
    .order('position', { ascending: true });

  if (itemsError) {
    console.error('Error fetching show items:', itemsError);
    throw itemsError;
  }

  return {
    show,
    items: items || []
  };
};

export const saveShow = async (
  show: {
    name: string;
    time: string;
    date: string;
    notes: string;
  },
  items: Array<{
    name: string;
    title?: string;
    details?: string;
    phone?: string;
    duration?: number;
    is_break: boolean;
    is_note: boolean;
    interviewees?: Array<{
      name: string;
      title?: string;
      phone?: string;
    }>;
  }>,
  showId?: string
) => {
  try {
    // If updating existing show
    if (showId) {
      const { error: showError } = await supabase
        .from('shows')
        .update({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
        })
        .eq('id', showId);

      if (showError) throw showError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;
    }

    // If creating new show
    if (!showId) {
      const { data: newShow, error: createError } = await supabase
        .from('shows')
        .insert({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
        })
        .select()
        .single();

      if (createError) throw createError;
      showId = newShow.id;
    }

    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        show_id: showId,
        position: index,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from('show_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return { id: showId };

  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
  }
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
