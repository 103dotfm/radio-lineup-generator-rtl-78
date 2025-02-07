
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { toast } from "sonner";

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>) => {
  try {
    // Get the current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Authentication error:', sessionError);
      throw new Error('Authentication required');
    }

    if (!session) {
      throw new Error('No active session');
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
  } catch (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }
};

export const deleteInterviewee = async (id: string) => {
  try {
    // Get the current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Authentication required');
    }

    const { error } = await supabase
      .from('interviewees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
};

export const getInterviewees = async (itemId: string) => {
  try {
    // Get the current session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('interviewees')
      .select('*')
      .eq('item_id', itemId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching interviewees:', error);
    throw error;
  }
};
