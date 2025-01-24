import { createClient } from '@supabase/supabase-js';
import { Show, ShowItem } from '@/types/show';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export const saveShow = async (
  show: Omit<Show, 'id' | 'created_at'>,
  items: Omit<ShowItem, 'id' | 'show_id' | 'position'>[]
) => {
  const { data: showData, error: showError } = await supabase
    .from('shows')
    .insert([show])
    .select()
    .single();

  if (showError) throw showError;

  const itemsWithPosition = items.map((item, index) => ({
    ...item,
    show_id: showData.id,
    position: index,
  }));

  const { error: itemsError } = await supabase
    .from('show_items')
    .insert(itemsWithPosition);

  if (itemsError) throw itemsError;

  return showData;
};

export const getShows = async () => {
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getShowWithItems = async (showId: string) => {
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

  return { show, items };
};

export const searchShows = async (query: string) => {
  const { data, error } = await supabase
    .from('shows')
    .select('*')
    .or(`name.ilike.%${query}%, notes.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};