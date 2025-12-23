import { api } from "@/lib/api-client";
import { Interviewee } from "@/types/show";

export interface DbInterviewee {
  id: string;
  item_id: string;
  name: string;
  title?: string;
  phone?: string;
  duration?: number;
  created_at?: string;
}

export const addInterviewee = async (interviewee: Omit<Interviewee, 'id' | 'created_at'>): Promise<DbInterviewee> => {
  console.log('Adding interviewee:', interviewee);
  
  // Check if item_id exists before adding
  const { data: itemCheck, error: checkError } = await api.query('/show-items', {
    where: { id: interviewee.item_id }
  });
    
  if (checkError || !itemCheck || itemCheck.length === 0) {
    console.error('Error checking item existence:', checkError);
    throw new Error(`Item with ID ${interviewee.item_id} does not exist. Cannot add interviewee.`);
  }
  
  const { data, error } = await api.mutate('/interviewees', {
    item_id: interviewee.item_id,
    name: interviewee.name,
    title: interviewee.title || null,
    phone: interviewee.phone || null,
    duration: interviewee.duration || null,
  }, 'POST');

  if (error) {
    console.error('Error adding interviewee:', error);
    throw error;
  }

  console.log('Added interviewee:', data);
  return data;
};

export const deleteInterviewee = async (id: string): Promise<void> => {
  const { error } = await api.mutate(`/interviewees/${id}`, {}, 'DELETE');

  if (error) {
    console.error('Error deleting interviewee:', error);
    throw error;
  }
};

export const getInterviewees = async (itemId: string): Promise<DbInterviewee[]> => {
  console.log('Getting interviewees for item:', itemId);
  const { data, error } = await api.query('/interviewees', {
    where: { item_id: itemId }
  });

  if (error) {
    console.error('Error getting interviewees:', error);
    throw error;
  }

  console.log('Retrieved interviewees:', data);
  return data || [];
};
