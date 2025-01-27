import { supabase } from './shows';

export interface Guest {
  id: string;
  name: string;
  title: string;
  phone: string;
  created_at: string;
}

export const searchGuests = async (query: string): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .or(`name.ilike.%${query}%, title.ilike.%${query}%, phone.ilike.%${query}%`)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const addGuest = async (guest: Omit<Guest, 'id' | 'created_at'>): Promise<Guest> => {
  const { data, error } = await supabase
    .from('guests')
    .insert([guest])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateGuest = async (id: string, guest: Partial<Guest>): Promise<Guest> => {
  const { data, error } = await supabase
    .from('guests')
    .update(guest)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};