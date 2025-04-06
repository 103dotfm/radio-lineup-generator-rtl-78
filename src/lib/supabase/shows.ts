
import { supabase } from "../supabase";
import { Show, ShowItem } from "@/types/show";

export const getShows = async (): Promise<Show[]> => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        items:show_items(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert to expected format and ensure items is always an array
    const shows = data?.map(show => ({
      ...show,
      items: Array.isArray(show.items) ? show.items : []
    })) || [];
    
    return shows;
  } catch (error) {
    console.error('Error fetching shows:', error);
    return [];
  }
};

export const searchShows = async (query: string): Promise<Show[]> => {
  try {
    // Try searching in shows first
    const { data: showResults, error: showError } = await supabase
      .from('shows')
      .select(`
        *,
        items:show_items(*)
      `)
      .or(`name.ilike.%${query}%,date::text.ilike.%${query}%,time.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (showError) {
      console.error('Error searching shows:', showError);
      throw showError;
    }

    // Then search in show items
    const { data: itemResults, error: itemError } = await supabase
      .from('show_items')
      .select(`
        *,
        show:shows(*)
      `)
      .or(`name.ilike.%${query}%,title.ilike.%${query}%,details.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (itemError) {
      console.error('Error searching items:', itemError);
      throw itemError;
    }

    // Convert item results to show results format
    const showsFromItems = itemResults
      .filter(item => item.show) // Filter out items that don't have a show
      .map(item => {
        const show = item.show as Show;
        if (!show) return null;
        return {
          ...show,
          items: [item]
        };
      })
      .filter(Boolean) as Show[]; // Remove null values

    // Ensure showResults items are arrays
    const processedShowResults = (showResults || []).map(show => ({
      ...show,
      items: Array.isArray(show.items) ? show.items : []
    }));
    
    // Merge results, avoiding duplicates
    const allShows: Show[] = [...processedShowResults];
    
    // Add shows from items if they're not already in the results
    showsFromItems.forEach(showFromItem => {
      if (!allShows.find(show => show.id === showFromItem.id)) {
        allShows.push(showFromItem);
      }
    });
    
    return allShows;
  } catch (error) {
    console.error('Error searching:', error);
    return [];
  }
};

export const getShow = async (id: string): Promise<Show | null> => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        items:show_items(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Ensure items is always an array
    return data ? {
      ...data,
      items: Array.isArray(data.items) ? data.items : []
    } : null;
  } catch (error) {
    console.error(`Error fetching show with ID ${id}:`, error);
    return null;
  }
};

export const getShowWithItems = async (id: string): Promise<{show: Show | null; items: ShowItem[]}> => {
  try {
    // Fetch the show
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', id)
      .single();
    
    if (showError) {
      console.error(`Error fetching show with ID ${id}:`, showError);
      throw showError;
    }
    
    // Fetch the show items
    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*')
      .eq('show_id', id)
      .order('position', { ascending: true });
    
    if (itemsError) {
      console.error(`Error fetching items for show with ID ${id}:`, itemsError);
      throw itemsError;
    }
    
    return { 
      show: show,
      items: items || []
    };
  } catch (error) {
    console.error(`Error in getShowWithItems for ID ${id}:`, error);
    return { show: null, items: [] };
  }
};

export const getShowsByDate = async (dateString: string): Promise<Show[]> => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        items:show_items(*)
      `)
      .eq('date', dateString)
      .order('time', { ascending: true });
    
    if (error) throw error;
    
    // Process data to ensure items is always an array
    return (data || []).map(show => ({
      ...show,
      items: Array.isArray(show.items) ? show.items : []
    }));
  } catch (error) {
    console.error(`Error fetching shows for date ${dateString}:`, error);
    return [];
  }
};

export const createShow = async (show: Partial<Show>): Promise<Show | null> => {
  try {
    // Ensure required properties exist
    if (!show.name) {
      throw new Error('Show name is required');
    }
    
    const { data, error } = await supabase
      .from('shows')
      .insert([show])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating show:', error);
    return null;
  }
};

export const updateShow = async (id: string, updates: Partial<Show>): Promise<Show | null> => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating show with ID ${id}:`, error);
    return null;
  }
};

export const deleteShow = async (id: string): Promise<boolean> => {
  try {
    // First delete all show items
    const { error: itemsError } = await supabase
      .from('show_items')
      .delete()
      .eq('show_id', id);
    
    if (itemsError) throw itemsError;
    
    // Then delete the show
    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting show with ID ${id}:`, error);
    return false;
  }
};

export const createShowItem = async (item: Partial<ShowItem>): Promise<ShowItem | null> => {
  try {
    // Ensure required properties exist
    if (!item.name || item.position === undefined) {
      throw new Error('Show item name and position are required');
    }
    
    const { data, error } = await supabase
      .from('show_items')
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating show item:', error);
    return null;
  }
};

export const updateShowItem = async (id: string, updates: Partial<ShowItem>): Promise<ShowItem | null> => {
  try {
    const { data, error } = await supabase
      .from('show_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error updating show item with ID ${id}:`, error);
    return null;
  }
};

export const deleteShowItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('show_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error(`Error deleting show item with ID ${id}:`, error);
    return false;
  }
};

export const saveShow = async (show: Partial<Show>, items: Partial<ShowItem>[], showId?: string): Promise<Show | null> => {
  try {
    // Start a transaction to save the show and its items
    let savedShow: Show | null = null;
    
    // Ensure show has name property which is required
    if (!show.name && !showId) {
      throw new Error('Show name is required for new shows');
    }
    
    if (showId) {
      // Update existing show
      const { data, error } = await supabase
        .from('shows')
        .update(show)
        .eq('id', showId)
        .select()
        .single();
      
      if (error) throw error;
      savedShow = data;
    } else {
      // Create new show
      const { data, error } = await supabase
        .from('shows')
        .insert([show])
        .select()
        .single();
      
      if (error) throw error;
      savedShow = data;
    }
    
    if (!savedShow) throw new Error('Failed to save show');
    
    // Delete existing items if updating a show
    if (showId) {
      const { error } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', showId);
      
      if (error) throw error;
    }
    
    // Add show_id to each item and add position index
    // Ensure each item has a name which is required
    const itemsToInsert = items
      .map((item, index) => ({
        ...item,
        name: item.name || 'Untitled Item', // Provide a default name
        show_id: savedShow!.id,
        position: index
      }));
    
    // Create new items if any exist
    if (itemsToInsert.length > 0) {
      const { error } = await supabase
        .from('show_items')
        .insert(itemsToInsert);
      
      if (error) throw error;
    }
    
    return savedShow;
  } catch (error) {
    console.error('Error saving show:', error);
    return null;
  }
};
