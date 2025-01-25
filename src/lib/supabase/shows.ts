import { createClient } from '@supabase/supabase-js';
import { Show, ShowItem } from '@/types/show';
import { toast } from 'sonner';

const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0';

const supabase = createClient(supabaseUrl, supabaseKey);

const createTablesIfNotExist = async () => {
  const { error: showsError } = await supabase.rpc('create_shows_table');
  if (showsError && !showsError.message.includes('already exists')) {
    console.error('Error creating shows table:', showsError);
  }

  const { error: showItemsError } = await supabase.rpc('create_show_items_table');
  if (showItemsError && !showItemsError.message.includes('already exists')) {
    console.error('Error creating show_items table:', showItemsError);
  }
};

// Initialize tables
createTablesIfNotExist();

export const saveShow = async (
  show: Omit<Show, 'id' | 'created_at'>,
  items: Omit<ShowItem, 'id' | 'show_id' | 'position'>[]
) => {
  try {
    const { data: showData, error: showError } = await supabase
      .from('shows')
      .insert([show])
      .select()
      .single();

    if (showError) {
      console.error('Show save error:', showError);
      throw showError;
    }

    const itemsWithPosition = items.map((item, index) => ({
      ...item,
      show_id: showData.id,
      position: index,
    }));

    const { error: itemsError } = await supabase
      .from('show_items')
      .insert(itemsWithPosition);

    if (itemsError) {
      console.error('Items save error:', itemsError);
      throw itemsError;
    }

    toast.success('התוכנית נשמרה בהצלחה');
    return showData;
  } catch (error) {
    console.error('Error saving show:', error);
    toast.error('שגיאה בשמירת התוכנית');
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

    if (showError) {
      console.error('Get show error:', showError);
      throw showError;
    }

    const { data: items, error: itemsError } = await supabase
      .from('show_items')
      .select('*')
      .eq('show_id', showId)
      .order('position');

    if (itemsError) {
      console.error('Get items error:', itemsError);
      throw itemsError;
    }

    return { show, items };
  } catch (error) {
    console.error('Error getting show with items:', error);
    throw error;
  }
};

export const searchShows = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .or(`name.ilike.%${query}%, notes.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Search shows error:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};