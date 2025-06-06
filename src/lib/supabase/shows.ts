import { supabase } from "@/lib/supabase";
import { Show } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  console.log('Fetching shows...');
  const { data: showsData, error } = await supabase
    .from('shows_backup')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }

  const shows: Show[] = showsData || [];

  // Fetch items for each show
  if (shows.length > 0) {
    const showIds = shows.map(show => show.id);
    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*, interviewees(*)')
      .in('show_id', showIds);

    if (itemsError) {
      console.error('Error fetching show items:', itemsError);
    } else if (items) {
      // Associate items with their respective shows
      shows.forEach(show => {
        show.items = items.filter(item => item.show_id === show.id);
      });
    }
  }

  console.log('Fetched shows count:', shows?.length);
  return shows;
};

export const searchShows = async (query: string): Promise<Show[]> => {
  console.log('Searching shows with query:', query);
  
  try {
    // First search for matching items
    const { data: matchingItems, error: itemsError } = await supabase
      .from('show_items')
      .select('*, show_id')
      .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
      .not('is_break', 'eq', true)
      .not('is_note', 'eq', true)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('Error searching items:', itemsError);
      throw itemsError;
    }

    // If we found matching items, fetch the associated shows
    if (matchingItems && matchingItems.length > 0) {
      const showIds = [...new Set(matchingItems.map(item => item.show_id))];
      
      const { data: shows, error: showsError } = await supabase
        .from('shows_backup')
        .select('*')
        .in('id', showIds);
        
      if (showsError) {
        console.error('Error fetching shows for items:', showsError);
        throw showsError;
      }
      
      if (shows && shows.length > 0) {
        // Transform results to Show objects with their matching items
        const showsWithItems = shows.map(show => {
          const items = matchingItems.filter(item => item.show_id === show.id);
          return {
            ...show,
            items
          };
        });
        
        console.log('Search results:', showsWithItems);
        return showsWithItems;
      }
    }
    
    // If no items matched or no associated shows found, return empty array
    return [];
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
    .from('shows_backup')
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

export const getShowsByDate = async (date: string): Promise<Show[]> => {
  console.log('Fetching shows for date:', date);
  
  try {
    const { data: shows, error } = await supabase
      .from('shows_backup')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching shows by date:', error);
      throw error;
    }

    console.log(`Found ${shows?.length || 0} shows for date ${date}:`, shows);
    
    if (shows && shows.length > 0) {
      const showIds = shows.map(show => show.id);
      
      const { data: items, error: itemsError } = await supabase
        .from('show_items')
        .select(`
          *,
          interviewees(*)
        `)
        .in('show_id', showIds)
        .order('position', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching items for shows:', itemsError);
        throw itemsError;
      }
      
      if (items) {
        const showsWithItems = shows.map(show => ({
          ...show,
          items: items.filter(item => item.show_id === show.id)
        }));
        
        console.log(`Added items to ${showsWithItems.length} shows`);
        return showsWithItems;
      }
    }
    
    return shows || [];
  } catch (error) {
    console.error('Error in getShowsByDate:', error);
    throw error;
  }
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
      const { data: existingShow, error: checkError } = await supabase
        .from('shows_backup')
        .select('id')
        .eq('id', showId)
        .single();
      
      if (checkError || !existingShow) {
        console.error('Show does not exist, creating new instead:', checkError);
        isUpdate = false;
        finalShowId = undefined;
      } else {
        const { error: showError } = await supabase
          .from('shows_backup')
          .update({
            name: show.name,
            time: show.time,
            date: show.date,
            notes: show.notes,
            slot_id: show.slot_id,
            created_at: new Date().toISOString()
          })
          .eq('id', showId);

        if (showError) throw showError;
        
        const { error: deleteError } = await supabase
          .from('show_items')
          .delete()
          .eq('show_id', showId);

        if (deleteError) throw deleteError;
      }
    }
      
    if (!isUpdate) {
      const newShow = {
        id: crypto.randomUUID(),
        name: show.name,
        time: show.time,
        date: show.date,
        notes: show.notes,
        slot_id: show.slot_id,
        created_at: new Date().toISOString()
      };

      const { data: insertedShow, error: createError } = await supabase
        .from('shows_backup')
        .insert(newShow)
        .select()
        .single();

      if (createError) {
        console.error('Error creating show:', createError);
        throw createError;
      }

      if (!insertedShow) {
        console.error('Failed to get ID for newly created show');
        throw new Error('Failed to create show - no ID returned');
      }

      console.log('Created new show:', insertedShow);
      finalShowId = insertedShow.id;
    }

    if (!finalShowId) {
      throw new Error('No valid show ID for item insertion');
    }

    if (show.slot_id) {
      const { error: slotError } = await supabase
        .from('schedule_slots_old')
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

      console.log('Final items to insert:', JSON.stringify(itemsToInsert, null, 2));
      
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
    .from('shows_backup')
    .delete()
    .eq('id', showId);

  if (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};
