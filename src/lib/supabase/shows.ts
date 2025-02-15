import { supabase } from "@/integrations/supabase/client";
import { Show, ShowItem } from "@/types/show";
import { addInterviewee, deleteInterviewee } from "./interviewees";

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
  const { data: existingShow, error: checkError } = await supabase
    .from('shows')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (checkError) throw checkError;
  if (!existingShow) throw new Error('Show not found');

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

    const { data: existingItems } = await supabase
      .from('show_items')
      .select('id')
      .eq('show_id', showId);

    const existingItemIds = new Set(existingItems?.map(item => item.id) || []);

    let savedItems = [];
    if (items.length > 0) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        const itemToSave = {
          id: itemId,
          show_id: showId,
          name: item.name || '',
          title: item.title,
          details: item.details,
          phone: item.phone,
          duration: item.duration,
          is_break: item.is_break || false,
          is_note: item.is_note || false,
          position: items.indexOf(item)
        };

        const { data: savedItem, error: itemError } = await supabase
          .from('show_items')
          .upsert(itemToSave)
          .select()
          .single();

        if (itemError) throw itemError;

        if (item.interviewees && item.interviewees.length > 0) {
          await supabase
            .from('interviewees')
            .delete()
            .eq('item_id', savedItem.id);

          const intervieweesToSave = item.interviewees.map(interviewee => ({
            item_id: savedItem.id,
            name: interviewee.name,
            title: interviewee.title,
            phone: interviewee.phone,
            duration: interviewee.duration
          }));

          const { error: intervieweesError } = await supabase
            .from('interviewees')
            .insert(intervieweesToSave);

          if (intervieweesError) throw intervieweesError;
        }

        savedItems.push(savedItem);
        existingItemIds.delete(itemId);
      }

      if (existingItemIds.size > 0) {
        const { error: deleteError } = await supabase
          .from('show_items')
          .delete()
          .in('id', Array.from(existingItemIds));

        if (deleteError) throw deleteError;
      }
    }

    return { id: showId, items: savedItems };
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
