
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
    
    return data || [];
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
        shows:shows(*)
      `)
      .or(`name.ilike.%${query}%,title.ilike.%${query}%,details.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (itemError) {
      console.error('Error searching items:', itemError);
      throw itemError;
    }

    // Convert item results to show results format
    const showsFromItems = itemResults
      .filter(item => item.shows) // Filter out items that don't have a show
      .map(item => {
        const show = item.shows as Show;
        return {
          ...show,
          items: [item]
        };
      });

    // Merge results, avoiding duplicates
    const allShows = [...(showResults || [])];
    
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
    
    return data;
  } catch (error) {
    console.error(`Error fetching show with ID ${id}:`, error);
    return null;
  }
};

export const createShow = async (show: Partial<Show>): Promise<Show | null> => {
  try {
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
