import { createClient } from '@supabase/supabase-js';
import { Show, ShowItem } from '@/types/show';
import { toast } from 'sonner';

const supabaseUrl = 'https://yyrmodgbnzqbmatlypuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cm1vZGdibnpxYm1hdGx5cHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3MDc2ODEsImV4cCI6MjA1MzI4MzY4MX0.GH07WGicLLqRaTk7fCaE-sJ2zK7e25eGtB3dbzh_cx0';

export const supabase = createClient(supabaseUrl, supabaseKey);

interface FrontendItem {
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  is_break?: boolean;
  is_note?: boolean;
}

export const saveShow = async (
  show: Omit<Show, 'id' | 'created_at'>,
  items: FrontendItem[],
  existingId?: string
) => {
  try {
    console.log('Starting save operation with items:', items);
    
    let showData;
    
    if (existingId) {
      const { data, error: showError } = await supabase
        .from('shows')
        .update({
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes
        })
        .eq('id', existingId)
        .select()
        .single();
      
      if (showError) throw showError;
      showData = data;

      const { error: deleteError } = await supabase
        .from('show_items')
        .delete()
        .eq('show_id', existingId);
      
      if (deleteError) throw deleteError;
    } else {
      const { data, error: showError } = await supabase
        .from('shows')
        .insert([{
          name: show.name,
          time: show.time,
          date: show.date,
          notes: show.notes
        }])
        .select()
        .single();
      
      if (showError) throw showError;
      showData = data;
    }

    const formattedItems = items.map((item, index) => ({
      show_id: showData.id,
      position: index,
      name: item.name || '',
      title: item.title || '',
      details: item.details || '',
      phone: item.phone || '',
      duration: item.duration || 0,
      is_break: Boolean(item.is_break),
      is_note: Boolean(item.is_note)
    }));

    console.log('Formatted items for DB:', formattedItems);

    const { error: itemsError } = await supabase
      .from('show_items')
      .insert(formattedItems);

    if (itemsError) {
      console.error('Error inserting items:', itemsError);
      throw itemsError;
    }

    return showData;
  } catch (error) {
    console.error('Error in saveShow:', error);
    throw error;
  }
};

export const getShows = async () => {
  try {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting shows:', error);
    throw error;
  }
};

export const getShowWithItems = async (showId: string) => {
  try {
    console.log('Fetching show:', showId);
    
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

    console.log('Raw items from database:', items);

    const mappedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      title: item.title,
      details: item.details,
      phone: item.phone,
      duration: item.duration,
      is_break: item.is_break === true,
      is_note: item.is_note === true
    }));

    return { show, items: mappedItems };
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

    // Then, search in show_items table with guest information
    const { data: itemsData, error: itemsError } = await supabase
      .from('show_items')
      .select(`
        show_id,
        name,
        title,
        details,
        phone
      `)
      .or(`name.ilike.%${query}%, title.ilike.%${query}%, details.ilike.%${query}%, phone.ilike.%${query}%`);

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
      
      // Add guest information to the shows
      additionalShows = relatedShows.map(show => ({
        ...show,
        guests: itemsData.filter(item => item.show_id === show.id)
      }));
    }

    // Add guest information to shows found directly
    const showsWithGuests = showsData?.map(show => ({
      ...show,
      guests: itemsData.filter(item => item.show_id === show.id)
    })) || [];

    // Combine and deduplicate results
    const allShows = [...showsWithGuests, ...additionalShows];
    const uniqueShows = Array.from(new Map(allShows.map(show => [show.id, show])).values());

    return uniqueShows;
  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};
