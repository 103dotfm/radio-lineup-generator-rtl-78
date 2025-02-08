
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { toast } from "sonner";

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>) => {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
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
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getInterviewees = async (itemId: string) => {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .select('*')
    .eq('item_id', itemId);

  if (error) throw error;
  return data;
};

