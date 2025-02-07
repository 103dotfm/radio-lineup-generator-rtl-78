
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
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) return null;

  const { data: items, error: itemsError } = await supabase
    .from('show_items')
    .select(`
      *,
      interviewees(*)
    `)
    .eq('show_id', id)
    .order('position');

  if (itemsError) throw itemsError;

  return { show, items: items || [] };
};

export const saveShow = async (show: Required<Pick<Show, 'name'>> & Partial<Show>, items: Partial<ShowItem>[], id?: string) => {
  try {
    let showId = id;

    // If no ID provided, create new show
    if (!showId) {
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
      // Verify show exists before updating
      const { data: existingShow, error: checkError } = await supabase
        .from('shows')
        .select('id')
        .eq('id', showId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (!existingShow) throw new Error('Show not found');

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

    // Delete existing items
    if (id) {
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;
    }

    // Insert new items
    if (items.length > 0) {
      const itemsWithShowId = items.map((item, index) => ({
        show_id: showId,
        position: index,
        name: item.name || '',
        title: item.title,
        details: item.details,
        phone: item.phone,
        duration: item.duration,
        is_break: item.is_break,
        is_note: item.is_note
      }));

      const { error: itemsError } = await supabase
        .rpc('insert_show_items', {
          items_array: itemsWithShowId
        });

      if (itemsError) throw itemsError;
    }

    return { id: showId };
  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
  }
};

export const searchShows = async (query: string) => {
  const { data: shows, error } = await supabase
    .from('shows')
    .select(`
      *,
      items:show_items(
        *,
        interviewees(*)
      )
    `)
    .or(`name.ilike.%${query}%, items.name.ilike.%${query}%, items.title.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching shows:', error);
    throw error;
  }

  return shows;
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
