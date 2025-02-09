
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { toast } from "sonner";

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>) => {
  // First check if we have an active session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Authentication error');
  }

  if (!session) {
    console.error('No active session found');
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .insert(interviewee)
    .select()
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }
  
  return data;
};

export const deleteInterviewee = async (id: string) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Session error or no session:', sessionError);
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getInterviewees = async (itemId: string) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('Session error or no session:', sessionError);
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .eq('item_id', itemId);

  if (error) throw error;
  return data;
};
