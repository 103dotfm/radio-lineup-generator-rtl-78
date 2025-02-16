
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";

export const getInterviewees = async (itemId: string) => {
  console.log('Getting interviewees for item:', itemId);
  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .eq('item_id', itemId);

  if (error) {
    console.error('Error getting interviewees:', error);
    throw error;
  }

  console.log('Retrieved interviewees for item', itemId, ':', data);
  return data;
};

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>) => {
  console.log('Adding interviewee:', interviewee);

  const { data, error } = await supabase
    .from('interviewees')
    .insert(interviewee)
    .select()
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }

  console.log('Added interviewee:', data);
  return data;
};

export const deleteInterviewee = async (id: string) => {
  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
};

export const updateInterviewee = async (id: string, updates: Partial<Interviewee>) => {
  const { data, error } = await supabase
    .from('interviewees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating interviewee:', error);
    throw error;
  }

  return data;
};
