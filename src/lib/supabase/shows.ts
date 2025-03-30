
import { supabase } from "@/lib/supabase";
import { Show } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  console.log('Fetching shows...');
  const { data: shows, error } = await supabase
    .from('shows_backup')
    .select('*');

  if (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }

  // Fetch items separately for each show
  const showsWithItems = await Promise.all((shows || []).map(async (show) => {
    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*')
      .eq('show_id', show.id);
      
    return {
      ...show,
      items: itemsError ? [] : (items || [])
    };
  }));

  console.log('Fetched shows:', showsWithItems);
  return showsWithItems || [];
};

export const searchShows = async (query: string): Promise<Show[]> => {
  console.log('Searching shows with query:', query);
  
  try {
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

    // Get unique show IDs from matching items
    const showIds = [...new Set((matchingItems || []).map(item => item.show_id))].filter(Boolean);
    
    if (showIds.length === 0) {
      return [];
    }
    
    // Fetch the shows for these IDs
    const { data: shows, error: showsError } = await supabase
      .from('shows_backup')
      .select('*')
      .in('id', showIds);
      
    if (showsError) {
      console.error('Error fetching shows:', showsError);
      throw showsError;
    }

    // Group items by show
    const result = (shows || []).map(show => {
      const showItems = (matchingItems || [])
        .filter(item => item.show_id === show.id)
        .map(item => ({
          id: item.id,
          show_id: item.show_id,
          position: item.position,
          name: item.name,
          title: item.title,
          phone: item.phone,
          details: item.details,
          duration: item.duration,
          is_break: item.is_break,
          is_note: item.is_note
        }));
        
      return {
        ...show,
        items: showItems
      };
    });

    console.log('Search results:', result);
    return result;

  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};

export const getShowWithItems = async (showId: string | undefined) => {
  console.log('Fetching show with ID:', showId);
  
  if (!showId || showId === "null" || showId === "undefined") {
    console.error('Invalid show ID provided:', showId);
    throw new Error(`Invalid show ID provided: ${showId}`);
  }

  try {
    const { data: show, error: showError } = await supabase
      .from('shows_backup')
      .select('*')
      .eq('id', showId)
      .single();

    if (showError) {
      console.error('Error fetching show:', showError);
      throw showError;
    }

    if (!show || !show.id) {
      console.error('Show not found or invalid:', showId);
      throw new Error(`Show not found: ${showId}`);
    }

    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*')
      .eq('show_id', showId)
      .order('position', { ascending: true });

    if (itemsError) {
      console.error('Error fetching show items:', itemsError);
      throw itemsError;
    }

    // Fetch interviewees separately for each item
    const itemsWithInterviewees = await Promise.all((items || []).map(async (item) => {
      const { data: interviewees, error: intervieweesError } = await supabase
        .from('interviewees')
        .select('*')
        .eq('item_id', item.id);
        
      return {
        ...item,
        interviewees: intervieweesError ? [] : (interviewees || [])
      };
    }));

    console.log('Retrieved items from database:', itemsWithInterviewees?.map(item => ({
      id: item.id,
      name: item.name,
      is_divider: item.is_divider,
      is_break: item.is_break,
      is_note: item.is_note
    })));

    return {
      show,
      items: itemsWithInterviewees || []
    };
  } catch (error) {
    console.error('Error getting show with items:', error);
    throw error;
  }
};

export const getShowsByDate = async (date: string): Promise<Show[]> => {
  console.log('Fetching shows for date:', date);
  
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
  return shows || [];
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
    console.log('Show data:', { ...show, showId });

    if (isUpdate) {
      // Update existing show
      if (!showId || showId === "null" || showId === "undefined") {
        console.error('Invalid show ID for update:', showId);
        throw new Error('Invalid show ID provided for update');
      }
      
      const { data: updateData, error: showError } = await supabase
        .from('shows_backup')
        .update({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
          slot_id: show.slot_id
        })
        .eq('id', showId)
        .select();

      if (showError) {
        console.error('Error updating show:', showError);
        throw showError;
      }
      
      console.log('Updated show successfully:', updateData);
      
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);

      if (deleteError) {
        console.error('Error deleting existing items:', deleteError);
        throw deleteError;
      }
      
    } else {
      // Create new show with specific return handling
      console.log('Creating new show with data:', show);
      
      const { data, error: createError } = await supabase
        .from('shows_backup')
        .insert([{
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes,
          slot_id: show.slot_id
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating new show:', createError);
        throw createError;
      }
      
      console.log('Received response after show creation:', data);
      
      if (!data || !data.id) {
        console.error('Failed to get ID for newly created show, data:', data);
        throw new Error('Failed to create show - no ID returned');
      }
      
      finalShowId = data.id;
      console.log('Created new show with id:', finalShowId);
    }

    // Update the schedule slot to indicate it has a lineup
    if (show.slot_id) {
      console.log('Updating schedule slot with has_lineup=true:', show.slot_id);
      const { data: slotData, error: slotError } = await supabase
        .from('schedule_slots_old')
        .update({ 
          has_lineup: true
        })
        .eq('id', show.slot_id)
        .select();

      if (slotError) {
        console.error('Error updating slot has_lineup:', slotError);
        throw slotError;
      }
      
      console.log('Updated slot successfully:', slotData);
    }

    // Only proceed with item insertion if we have a valid show ID
    if (finalShowId && items.length > 0) {
      console.log('Inserting items for show ID:', finalShowId);
      
      const itemsToInsert = items.map((item, index) => {
        const isDivider = Boolean(item.is_divider);
        const isBreak = Boolean(item.is_break);
        const isNote = Boolean(item.is_note);
        
        const { interviewees, ...itemData } = item;
        
        return {
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
      });
      
      const { data: insertedItems, error: itemsError } = await supabase
        .from('show_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        throw itemsError;
      }

      console.log('Successfully inserted items:', insertedItems?.length || 0);

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

            console.log(`Inserting ${intervieweesToInsert.length} interviewees for item ${item.id}`);
            
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
