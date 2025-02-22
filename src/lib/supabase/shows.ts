import { supabase } from "@/integrations/supabase/client";
import { Show, ShowItem } from "@/types/show";

export const getShows = async () => {
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

  return shows;
};

export const getShowWithItems = async (id: string) => {
  // First check if the show exists
  const { data: existingShow, error: checkError } = await supabase
    .from('shows')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (!existingShow) throw new Error('Show not found');

  // Then get the items with their interviewees
  const { data: items, error: itemsError } = await supabase
    .from('show_items')
    .select(`
      *,
      interviewees(*)
    `)
    .eq('show_id', id)
    .order('position');

  if (itemsError) throw itemsError;

  return { show: existingShow, items: items || [] };
};

export const saveShow = async (show: Required<Pick<Show, 'name'>> & Partial<Show>, items: Partial<ShowItem>[], showId?: string) => {
  try {
    let existingShow;
    
    // First check if the show exists
    if (showId) {
      const { data: showCheck, error: checkError } = await supabase
        .from('shows')
        .select('id')
        .eq('id', showId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (!showCheck) throw new Error('Show not found');
      existingShow = showCheck;
    }

    // If no existing show, create new one
    if (!existingShow) {
      const { data: newShow, error: showError } = await supabase
        .from('shows')
        .insert({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes
        })
        .select()
        .single();

      if (showError) throw showError;
      showId = newShow.id;
    } else {
      // Update existing show
      const { error: updateError } = await supabase
        .from('shows')
        .update({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes
        })
        .eq('id', showId);

      if (updateError) throw updateError;
    }

    // Delete existing items and their interviewees
    if (showId) {
      // First get all existing item IDs
      const { data: existingItems } = await supabase
        .from('show_items')
        .select('id')
        .eq('show_id', showId);

      if (existingItems && existingItems.length > 0) {
        const itemIds = existingItems.map(item => item.id);
        
        // Delete interviewees first (due to foreign key constraints)
        const { error: deleteIntervieweesError } = await supabase
          .from('interviewees')
          .delete()
          .in('item_id', itemIds);

        if (deleteIntervieweesError) throw deleteIntervieweesError;

        // Then delete items
        const { error: deleteItemsError } = await supabase
          .from('show_items')
          .delete()
          .eq('show_id', showId);

        if (deleteItemsError) throw deleteItemsError;
      }
    }

    // Insert new items
    if (items.length > 0) {
      // First insert items
      const itemsWithShowId = items.map((item, index) => ({
        show_id: showId,
        position: index,
        name: item.name || '',
        title: item.title,
        details: item.details,
        phone: item.phone,
        duration: item.duration,
        is_break: item.is_break || false,
        is_note: item.is_note || false
      }));

      const { data: newItems, error: itemsError } = await supabase
        .from('show_items')
        .insert(itemsWithShowId)
        .select('*');

      if (itemsError) throw itemsError;

      // Then insert interviewees for each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const newItem = newItems[i];
        
        if (item.interviewees && item.interviewees.length > 0) {
          const intervieweesWithItemId = item.interviewees.map(interviewee => ({
            item_id: newItem.id,
            name: interviewee.name,
            title: interviewee.title,
            phone: interviewee.phone,
            duration: interviewee.duration
          }));

          const { error: intervieweesError } = await supabase
            .from('interviewees')
            .insert(intervieweesWithItemId);

          if (intervieweesError) throw intervieweesError;
        }
      }
    }

    return { id: showId };
  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
  }
};

export const searchShows = async (query: string) => {
  // First, get all shows with their items
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      *,
      items:show_items(
        *,
        interviewees(*)
      )
    `)
    .or(`name.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching shows:', error);
    throw error;
  }

  // Then, get shows where any item matches the query
  const { data: itemMatches, error: itemError } = await supabase
    .from('shows')
    .select(`
      *,
      items:show_items!inner(
        *,
        interviewees(*)
      )
    `)
    .or(`items.name.ilike.%${query}%,items.title.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (itemError) {
    console.error('Error searching show items:', itemError);
    throw itemError;
  }

  // Combine and deduplicate results
  const allShows = [...(shows || []), ...(itemMatches || [])];
  const uniqueShows = Array.from(new Map(allShows.map(show => [show.id, show])).values());

  return uniqueShows;
};

export const deleteShow = async (id: string) => {
  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};
