
import { supabase } from "@/lib/supabase";
import { Show } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  console.log('Fetching shows...');
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

  console.log('Fetched shows:', shows);
  return shows || [];
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

  // Debug logs for incoming data
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
      // Update existing show
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
      
      // Get all existing items to later check which interviewees need to be deleted
      const { data: existingItems, error: fetchError } = await supabase
        .from('show_items')
        .select('id')
        .eq('show_id', showId);
        
      if (fetchError) throw fetchError;
      
      // Delete all existing items for this show - we'll recreate them
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;
      
    } else {
      // Creating new show
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

    // Update schedule slot to link with this show
    if (show.slot_id) {
      const { error: slotError } = await supabase
        .from('schedule_slots')
        .update({ 
          has_lineup: true
        })
        .eq('id', show.slot_id);

      if (slotError) throw slotError;
    }

    // Insert new items
    if (items.length > 0) {
      // CRITICAL FIX: Add debug logging before inserting and explicitly make sure is_divider is kept as a boolean
      console.log('Items being saved:', JSON.stringify(items, null, 2));
      
      // Pre-process items to ensure correct boolean flags for special types
      const itemsToInsert = items.map((item, index) => {
        // Keep track of interviewees but don't include them in the item insert
        const { interviewees, ...itemData } = item;
        
        // CRITICAL FIX: directly access is_divider property from the original item object
        // and explicitly convert it to a boolean to ensure it's preserved
        const is_break = Boolean(itemData.is_break);
        const is_note = Boolean(itemData.is_note);
        const is_divider = Boolean(itemData.is_divider);
        
        console.log(`Pre-processing item ${index} (${itemData.name}):`, {
          is_break,
          is_note,
          is_divider,
          raw_is_divider: itemData.is_divider,
          raw_is_divider_type: typeof itemData.is_divider
        });
        
        // Create a cleaned version of the item to insert with explicit boolean values
        const cleanedItem = {
          show_id: finalShowId,
          position: index,
          name: itemData.name,
          title: itemData.title || null,
          details: itemData.details || null,
          phone: itemData.phone || null,
          duration: itemData.duration || 0,
          // Force explicit boolean values
          is_break,
          is_note,
          is_divider
        };
        
        console.log(`Final processed item ${index} (${cleanedItem.name}):`, {
          is_break: cleanedItem.is_break,
          is_note: cleanedItem.is_note,
          is_divider: cleanedItem.is_divider,
          name: cleanedItem.name
        });
        
        return cleanedItem;
      });

      console.log('Items to insert:', JSON.stringify(itemsToInsert, null, 2));
      
      // Generate SQL for logging purposes
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

      console.log('Successfully inserted items:', insertedItems);

      // Now that we have the inserted items with their new IDs, we can insert the interviewees
      if (insertedItems) {
        for (let i = 0; i < insertedItems.length; i++) {
          const item = insertedItems[i];
          const itemInterviewees = items[i].interviewees;
          
          if (itemInterviewees && itemInterviewees.length > 0) {
            // Create interviewees for this item
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
