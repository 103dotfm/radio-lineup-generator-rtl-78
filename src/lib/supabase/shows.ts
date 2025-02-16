
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
  console.log('Getting show with items:', id);
  
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
      interviewees (
        id,
        item_id,
        name,
        title,
        phone,
        duration,
        created_at
      )
    `)
    .eq('show_id', id)
    .order('position');

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    throw itemsError;
  }

  console.log('Fetched show items with interviewees:', items);

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

    // Create or update show
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

    // Get existing items to track what needs to be deleted
    const { data: existingItems } = await supabase
      .from('show_items')
      .select(`
        id,
        position,
        interviewees (id)
      `)
      .eq('show_id', showId);

    const existingItemsMap = new Map(existingItems?.map(item => [item.id, item]) || []);
    let savedItems = [];

    // Save items and their interviewees
    if (items.length > 0) {
      for (const [index, item] of items.entries()) {
        // Preserve existing item ID or create new one
        const itemId = item.id || crypto.randomUUID();
        const existingItem = existingItemsMap.get(itemId);
        existingItemsMap.delete(itemId);

        console.log('Processing item:', {
          itemId,
          isExisting: !!existingItem,
          item
        });

        // Save item
        const { data: savedItem, error: itemError } = await supabase
          .from('show_items')
          .upsert({
            id: itemId,
            show_id: showId,
            name: item.name || '',
            title: item.title,
            details: item.details,
            phone: item.phone,
            duration: item.duration,
            is_break: item.is_break || false,
            is_note: item.is_note || false,
            position: index // Use index for consistent ordering
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Don't delete existing interviewees unless we have new ones to replace them
        if (item.interviewees?.length > 0) {
          // Delete existing interviewees only if we have new ones
          const { error: deleteError } = await supabase
            .from('interviewees')
            .delete()
            .eq('item_id', itemId);

          if (deleteError) throw deleteError;

          // Insert new interviewees
          const { error: insertError } = await supabase
            .from('interviewees')
            .insert(
              item.interviewees.map(interviewee => ({
                item_id: itemId,
                name: interviewee.name,
                title: interviewee.title,
                phone: interviewee.phone,
                duration: interviewee.duration
              }))
            );

          if (insertError) throw insertError;
        }

        // Fetch the complete item with its interviewees
        const { data: completeItem, error: fetchError } = await supabase
          .from('show_items')
          .select(`
            *,
            interviewees (
              id,
              item_id,
              name,
              title,
              phone,
              duration,
              created_at
            )
          `)
          .eq('id', itemId)
          .single();

        if (fetchError) throw fetchError;

        savedItems.push(completeItem);
      }

      // Delete items that are no longer in the list
      const itemsToDelete = Array.from(existingItemsMap.keys());
      if (itemsToDelete.length > 0) {
        console.log('Deleting removed items:', itemsToDelete);
        const { error: deleteError } = await supabase
          .from('show_items')
          .delete()
          .in('id', itemsToDelete);

        if (deleteError) throw deleteError;
      }
    }

    console.log('Saved show with items:', {
      showId,
      itemCount: savedItems.length,
      items: savedItems
    });

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
