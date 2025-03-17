
import { supabase } from "@/lib/supabase";
import { Show } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  console.log('Fetching shows...');
  try {
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

    console.log('Fetched shows:', shows?.length || 0);
    return shows || [];
  } catch (error) {
    console.error('Unexpected error fetching shows:', error);
    throw error;
  }
};

export const searchShows = async (query: string): Promise<Show[]> => {
  console.log('Searching shows with query:', query);
  
  try {
    const { data: matchingItems, error: itemsError } = await supabase
      .from('show_items')
      .select('*, show:show_id(*)')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('Error searching items:', itemsError);
      throw itemsError;
    }

    if (!matchingItems || matchingItems.length === 0) {
      console.log('No matching items found for query:', query);
      return [];
    }

    const shows = matchingItems.reduce((acc: { [key: string]: Show }, item) => {
      if (!item.show) return acc;
      
      const showId = item.show.id;
      if (!acc[showId]) {
        acc[showId] = {
          ...item.show,
          items: []
        };
      }
      
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

    console.log('Search results:', Object.values(shows || {}).length);
    return Object.values(shows || {});

  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};

export const getShowWithItems = async (showId: string) => {
  console.log('Fetching show with ID:', showId);
  
  if (!showId) {
    console.error('No show ID provided');
    throw new Error('No show ID provided');
  }

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

  console.log('Retrieved items from database:', items?.map(item => ({
    id: item.id,
    name: item.name,
    is_divider: item.is_divider,
    is_break: item.is_break,
    is_note: item.is_note
  })));

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
    slot_id?: string;
  },
  items: Array<{
    name: string;
    title?: string;
    details?: string;
    phone?: string;
    duration?: number;
    is_break: boolean;
    is_note: boolean;
    is_divider?: boolean;
    interviewees?: Array<{
      name: string;
      title?: string;
      phone?: string;
      duration?: number;
      id?: string;
    }>;
  }>,
  showId?: string
) => {
  try {
    let finalShowId = showId;
    let isUpdate = Boolean(showId);
    console.log('Saving show. Is update?', isUpdate);

    if (isUpdate) {
      const { error: showError } = await supabase
        .from('shows')
        .update({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
          slot_id: show.slot_id
        })
        .eq('id', showId);

      if (showError) throw showError;
      
      const { data: existingItems, error: fetchError } = await supabase
        .from('show_items')
        .select('id')
        .eq('show_id', showId);
        
      if (fetchError) throw fetchError;
      
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;
      
    } else {
      const { data: newShow, error: createError } = await supabase
        .from('shows')
        .insert({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
          slot_id: show.slot_id
        })
        .select()
        .single();

      if (createError) throw createError;
      finalShowId = newShow.id;
    }

    if (show.slot_id) {
      const { error: slotError } = await supabase
        .from('schedule_slots')
        .update({ 
          has_lineup: true
        })
        .eq('id', show.slot_id);

      if (slotError) throw slotError;
    }

    if (items.length > 0) {
      console.log('RAW ITEMS BEFORE PROCESSING:', items.map(item => ({
        name: item.name,
        is_divider: item.is_divider,
        type: typeof item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));

      const itemsToInsert = items.map((item, index) => {
        const isDivider = Boolean(item.is_divider);
        const isBreak = Boolean(item.is_break);
        const isNote = Boolean(item.is_note);
        
        console.log(`DIRECT ACCESS - Item ${index} (${item.name}):`, {
          isDivider,
          is_divider_value: item.is_divider,
          is_divider_type: typeof item.is_divider
        });
        
        const { interviewees, ...itemData } = item;
        
        const cleanedItem = {
          show_id: finalShowId,
          position: index,
          name: item.name,
          title: item.title || null,
          details: item.details || null,
          phone: item.phone || null,
          duration: item.duration || 0,
          is_break: isBreak,
          is_note: isNote,
          is_divider: isDivider
        };
        
        console.log(`Processed item ${index} (${cleanedItem.name}):`, {
          is_break: cleanedItem.is_break,
          is_note: cleanedItem.is_note,
          is_divider: cleanedItem.is_divider,
          preserved_is_divider: isDivider
        });
        
        return cleanedItem;
      });

      console.log('Original items before mapping:', JSON.stringify(items.map(item => ({
        name: item.name,
        is_divider: item.is_divider,
        is_divider_type: typeof item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })), null, 2));
      
      console.log('Final items to insert:', JSON.stringify(itemsToInsert, null, 2));
      
      const insertRawSql = `
        INSERT INTO show_items(show_id, position, name, title, details, phone, duration, is_break, is_note, is_divider)
        VALUES ${itemsToInsert.map((item, i) => 
          `('${item.show_id}', ${item.position}, '${item.name}', ${item.title ? `'${item.title}'` : 'NULL'}, ${item.details ? `'${item.details}'` : 'NULL'}, ${item.phone ? `'${item.phone}'` : 'NULL'}, ${item.duration}, ${item.is_break}, ${item.is_note}, ${item.is_divider})`
        ).join(', ')}
        RETURNING *
      `;
      
      console.log('SQL to be executed:', insertRawSql);
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from('show_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        throw itemsError;
      }

      console.log('Successfully inserted items:', insertedItems?.map(item => ({
        id: item.id,
        name: item.name,
        is_divider: item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));

      if (insertedItems) {
        for (let i = 0; i < insertedItems.length; i++) {
          const item = insertedItems[i];
          const itemInterviewees = items[i].interviewees;
          
          if (itemInterviewees && itemInterviewees.length > 0) {
            const intervieweesToInsert = itemInterviewees.map(interviewee => ({
              item_id: item.id,
              name: interviewee.name,
              title: interviewee.title || null,
              phone: interviewee.phone || null,
              duration: interviewee.duration || null
            }));

            console.log(`Inserting ${intervieweesToInsert.length} interviewees for item ${item.id}:`, intervieweesToInsert);
            
            const { error: intervieweesError } = await supabase
              .from('interviewees')
              .insert(intervieweesToInsert);

            if (intervieweesError) {
              console.error('Error inserting interviewees:', intervieweesError);
              throw intervieweesError;
            }
          }
        }
      }
    }

    return { id: finalShowId };
  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
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
