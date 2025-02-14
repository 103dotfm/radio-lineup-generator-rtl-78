
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { Database } from "@/integrations/supabase/types";

type DbInterviewee = Database['public']['Tables']['interviewees']['Row'];

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>): Promise<DbInterviewee> => {
  console.log('Adding interviewee:', interviewee);
  
  // Validate item_id
  if (!interviewee.item_id) {
    throw new Error('Item ID is required');
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
  console.log('Deleting interviewee:', id);
  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
  console.log('Successfully deleted interviewee:', id);
};

export const getInterviewees = async (itemId: string): Promise<DbInterviewee[]> => {
  if (!itemId) {
    console.error('Item ID is required for getting interviewees');
    return [];
  }

  console.log('Getting interviewees for item:', itemId);
  
  // Query for interviewees
  console.log('Querying interviewees with item_id:', itemId);
  
  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .eq('item_id', itemId);

  if (error) {
    console.error('Error getting interviewees:', error);
    throw error;
  }

  console.log('Retrieved interviewees for item', itemId, ':', data);
  return data || [];
};

