
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { Database } from "@/integrations/supabase/types";

type DbInterviewee = Database['public']['Tables']['interviewees']['Row'];

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>): Promise<DbInterviewee> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.user?.id) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .insert({
      item_id: interviewee.item_id,
      name: interviewee.name,
      title: interviewee.title || null,
      phone: interviewee.phone || null,
      duration: interviewee.duration || null,
      user_id: sessionData.session.user.id
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }

  return data;
};

export const deleteInterviewee = async (id: string): Promise<void> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.user?.id) {
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('interviewees')
    .delete()
    .match({ id, user_id: sessionData.session.user.id });

  if (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
};

export const getInterviewees = async (itemId: string): Promise<DbInterviewee[]> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.user?.id) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .match({ 
      item_id: itemId,
      user_id: sessionData.session.user.id 
    });

  if (error) {
    console.error('Error getting interviewees:', error);
    throw error;
  }

  return data || [];
};
