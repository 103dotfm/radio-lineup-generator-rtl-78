import { supabase } from './shows';

export interface Guest {
  id: string;
  name: string;
  title: string;
  phone: string;
  created_at: string;
}

export const searchGuests = async (query: string): Promise<Guest[]> => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .or(`name.ilike.%${query}%, title.ilike.%${query}%, phone.ilike.%${query}%`)
      .order('name');

    if (error) {
      console.error('Error searching guests:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error searching guests:', error);
    return [];
  }
};

export const addGuest = async (guest: Omit<Guest, 'id' | 'created_at'>): Promise<Guest | null> => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .insert([guest])
      .select()
      .single();

    if (error) {
      console.error('Error adding guest:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error adding guest:', error);
    return null;
  }
};

export const updateGuest = async (id: string, guest: Partial<Guest>): Promise<Guest | null> => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update(guest)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating guest:', error);
    return null;
  }
};