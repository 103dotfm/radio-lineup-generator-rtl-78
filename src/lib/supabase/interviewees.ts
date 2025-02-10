
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { toast } from "sonner";

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>) => {
  console.log('Starting addInterviewee process');
  
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  console.log('Authenticated user ID:', session.session.user.id);

  const { data, error } = await supabase
    .from('interviewees')
    .insert({
      ...interviewee,
      user_id: session.session.user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }
  
  console.log('Successfully added interviewee:', data);
  return data as Interviewee;
};

export const deleteInterviewee = async (id: string) => {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id)
    .eq('user_id', session.session.user.id);

  if (error) throw error;
};

export const getInterviewees = async (itemId: string): Promise<Interviewee[]> => {
  const { data: session } = await supabase.auth.getSession();
  
  if (!session?.session?.user) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .select()
    .eq('item_id', itemId)
    .eq('user_id', session.session.user.id) as { data: Interviewee[] | null, error: any };

  if (error) throw error;
  return (data || []) as Interviewee[];
};
