
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { Database } from "@/integrations/supabase/types";

type DbInterviewee = Database['public']['Tables']['interviewees']['Row'];

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>): Promise<DbInterviewee> => {
  console.log('Adding interviewee:', interviewee);
  
  // Check if item_id exists before adding
  const { data: itemCheck, error: checkError } = await supabase
    .from('show_items')
    .select('id')
    .eq('id', interviewee.item_id)
    .single();
    
  if (checkError) {
    console.error('Error checking item existence:', checkError);
    throw new Error(`Item with ID ${interviewee.item_id} does not exist. Cannot add interviewee.`);
  }
  
  const { data, error } = await supabase
    .from('interviewees')
    .insert({
      item_id: interviewee.item_id,
      name: interviewee.name,
      title: interviewee.title || null,
      phone: interviewee.phone || null,
      duration: interviewee.duration || null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }

  console.log('Added interviewee:', data);
  return data;
};

export const deleteInterviewee = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('interviewees')
    .delete()
    .match({ id });

  if (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
};

export const getInterviewees = async (itemId: string): Promise<DbInterviewee[]> => {
  console.log('Getting interviewees for item:', itemId);
  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .match({ item_id: itemId });

  if (error) {
    console.error('Error getting interviewees:', error);
    throw error;
  }

  console.log('Retrieved interviewees:', data);
  return data || [];
};
