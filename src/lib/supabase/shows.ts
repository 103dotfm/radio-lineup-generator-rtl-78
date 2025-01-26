import { createClient } from '@supabase/supabase-js';
import { Show, ShowItem } from '@/types/show';
import { toast } from 'sonner';

const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0';

const supabase = createClient(supabaseUrl, supabaseKey);

const createTablesIfNotExist = async () => {
  // Create shows table
  const { error: showsError } = await supabase.from('shows').select('id').limit(1);
  if (showsError?.code === '42P01') { // Table doesn't exist error code
    const { error } = await supabase.from('shows').insert({
      id: 'temp',
      name: 'temp'
    }).select();
    
    if (error && !error.message.includes('already exists')) {
      console.error('Error creating shows table:', error);
    }
  }

  // Create show_items table
  const { error: itemsError } = await supabase.from('show_items').select('id').limit(1);
  if (itemsError?.code === '42P01') { // Table doesn't exist error code
    const { error } = await supabase.from('show_items').insert({
      id: 'temp',
      show_id: 'temp',
      name: 'temp',
      position: 0
    }).select();
    
    if (error && !error.message.includes('already exists')) {
      console.error('Error creating show_items table:', error);
    }
  }
};

// Initialize tables
createTablesIfNotExist();

export const saveShow = async (
  show: Omit<Show, 'id' | 'created_at'>,
  items: Omit<ShowItem, 'id' | 'show_id' | 'position'>[]
) => {
  try {
    let showData;
    
    // If show has an ID, update it instead of creating a new one
    if ('id' in show) {
      const { data, error: showError } = await supabase
        .from('shows')
        .update(show)
        .eq('id', show.id)
        .select()
        .single();
      
      if (showError) throw showError;
      showData = data;
      
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', show.id);
        
      if (deleteError) throw deleteError;
    } else {
      // Create new show if no ID exists
      const { data, error: showError } = await supabase
        .from('shows')
        .insert([show])
        .select()
        .single();
        
      if (showError) throw showError;
      showData = data;
    }

    const itemsWithPosition = items.map((item, index) => ({
      ...item,
      show_id: showData.id,
      position: index,
      is_break: item.is_break || false
    }));

    const { error: itemsError } = await supabase
      .from('show_items')
      .insert(itemsWithPosition);

    if (itemsError) throw itemsError;

    return showData;
  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
  }
};

export const getShows = async () => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get shows error:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting shows:', error);
    throw error;
  }
};

export const getShowWithItems = async (showId: string) => {
  try {
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single();

    if (showError) throw showError;

    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*')
      .eq('show_id', showId)
      .order('position');

    if (itemsError) throw itemsError;

    return { 
      show, 
      items: items.map(item => ({
        ...item,
        isBreak: item.is_break
      }))
    };
  } catch (error) {
    console.error('Error getting show with items:', error);
    throw error;
  }
};

export const searchShows = async (query: string) => {
  try {
    // First, search in shows table
    const { data: showsData, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .or(`name.ilike.%${query}%, notes.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (showsError) throw showsError;

    // Then, search in show_items table
    const { data: itemsData, error: itemsError } = await supabase
      .from('show_items')
      .select('show_id, name, title, details')
      .or(`name.ilike.%${query}%, title.ilike.%${query}%, details.ilike.%${query}%`);

    if (itemsError) throw itemsError;

    // Get unique show IDs from items search
    const showIdsFromItems = [...new Set(itemsData.map(item => item.show_id))];

    // If we found shows through items, fetch those shows
    let additionalShows: any[] = [];
    if (showIdsFromItems.length > 0) {
      const { data: relatedShows, error: relatedError } = await supabase
        .from('shows')
        .select('*')
        .in('id', showIdsFromItems)
        .order('created_at', { ascending: false });

      if (relatedError) throw relatedError;
      additionalShows = relatedShows;
    }

    // Combine and deduplicate results
    const allShows = [...(showsData || []), ...additionalShows];
    const uniqueShows = Array.from(new Map(allShows.map(show => [show.id, show])).values());

    return uniqueShows;
  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};
