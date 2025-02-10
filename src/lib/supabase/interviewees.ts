
import { supabase } from "@/integrations/supabase/client";
import { Interviewee } from "@/types/show";
import { Database } from "@/integrations/supabase/types";

type IntervieweeRow = Database['public']['Tables']['interviewees']['Row'];

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>): Promise<Interviewee> => {
  console.log('Starting addInterviewee process');
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Authentication error');
  }

  if (!session?.user?.id) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  console.log('Authenticated user ID:', session.user.id);

  const { data, error } = await supabase
    .from('interviewees')
    .insert([{
      ...interviewee,
      user_id: session.user.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }
  
  console.log('Successfully added interviewee:', data);
  return data as Interviewee;
};

export const deleteInterviewee = async (id: string): Promise<void> => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Authentication error');
  }

  if (!session?.user?.id) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  const { error } = await supabase
    .from('interviewees')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) throw error;
};

export const getInterviewees = async (itemId: string): Promise<IntervieweeRow[]> => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Authentication error');
  }

  if (!session?.user?.id) {
    console.error('No authenticated user found');
    throw new Error('Authentication required');
  }

  const { data, error } = await supabase
    .from('interviewees')
    .select()
    .eq('item_id', itemId)
    .eq('user_id', session.user.id);

  if (error) throw error;
  
  return data || [];
};
