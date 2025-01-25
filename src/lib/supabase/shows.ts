import { createClient } from '@supabase/supabase-js';
import { Show, ShowItem } from '@/types/show';
import { toast } from 'sonner';

const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0';

const supabase = createClient(supabaseUrl, supabaseKey);

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

    toast.success('התוכנית נשמרה בהצלחה');
    return showData;
  } catch (error) {
    console.error('Error saving show:', error);
    toast.error('שגיאה בשמירת התוכנית');
    throw error;
  }
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
