
import { supabase } from "@/integrations/supabase/client";
import { Show, ShowItem, Interviewee } from "@/types/show";

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

  if (error) throw error;
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
      interviewees (*)
    `)
    .eq('show_id', id)
    .order('position');

  if (itemsError) throw itemsError;

  return { show: existingShow, items: items || [] };
};

export const saveShow = async (show: Required<Pick<Show, 'name'>> & Partial<Show>, items: Partial<ShowItem>[], showId?: string) => {
  try {
    // Save or update show
    const showData = {
      name: show.name,
      time: show.time,
      date: show.date,
      notes: show.notes
    };

    let savedShowId = showId;
    
    if (!showId) {
      const { data: newShow, error: createError } = await supabase
        .from('shows')
        .insert(showData)
        .select()
        .single();

      if (createError) throw createError;
      savedShowId = newShow.id;
    } else {
      const { error: updateError } = await supabase
        .from('shows')
        .update(showData)
        .eq('id', showId);

      if (updateError) throw updateError;
    }

    // Get existing items with their interviewees
    const { data: existingItems } = await supabase
      .from('show_items')
      .select(`
        *,
        interviewees (*)
      `)
      .eq('show_id', savedShowId);

    const existingItemsMap = new Map(existingItems?.map(item => [item.id, item]) || []);
    let savedItems: (ShowItem & { interviewees: Interviewee[] })[] = [];

    // Update or create items while preserving interviewees
    for (const [index, item] of items.entries()) {
      const itemId = item.id || crypto.randomUUID();
      const existingItem = existingItemsMap.get(itemId);
      existingItemsMap.delete(itemId);

      console.log('Processing item:', {
        itemId,
        isExisting: !!existingItem,
        item
      });

      // Preserve existing interviewees if not explicitly provided
      const interviewees = item.interviewees || (existingItem?.interviewees || []);

      // Save item
      const { data: savedItem, error: itemError } = await supabase
        .from('show_items')
        .upsert({
          id: itemId,
          show_id: savedShowId,
          name: item.name || '',
          title: item.title,
          details: item.details,
          phone: item.phone,
          duration: item.duration,
          is_break: item.is_break || false,
          is_note: item.is_note || false,
          position: index
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Type cast the saved item to include interviewees
      const fullItem: ShowItem & { interviewees: Interviewee[] } = {
        ...savedItem,
        interviewees
      };

      savedItems.push(fullItem);
    }

    // Only delete items that are explicitly removed
    const itemsToDelete = Array.from(existingItemsMap.keys());
    if (itemsToDelete.length > 0) {
      console.log('Deleting removed items:', itemsToDelete);
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .in('id', itemsToDelete);

      if (deleteError) throw deleteError;
    }

    console.log('Saved show with items:', {
      showId: savedShowId,
      itemCount: savedItems.length,
      items: savedItems
    });

    return { id: savedShowId, items: savedItems };
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

  if (error) throw error;
  return shows;
};

export const deleteShow = async (id: string) => {
  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
