
import { supabase } from "@/lib/supabase";
import { format } from 'date-fns';
import { ProducerWorkArrangement } from '../types/producer.types';

export const getOrCreateProducerWorkArrangement = async (weekStart: Date) => {
  try {
    // Format as YYYY-MM-DD for consistent date handling
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    
    // First try to get existing arrangement
    const { data, error } = await supabase
      .from('producer_work_arrangements')
      .select('*')
      .eq('week_start', formattedDate)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 means no rows returned - create a new arrangement
        const { data: newArrangement, error: createError } = await supabase
          .from('producer_work_arrangements')
          .insert({ week_start: formattedDate })
          .select()
          .single();
          
        if (createError) throw createError;
        return newArrangement;
      } else {
        throw error;
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error with producer work arrangement:", error);
    throw error;
  }
};

export const updateProducerWorkArrangementNotes = async (id: string, notes: string) => {
  try {
    const { error } = await supabase
      .from('producer_work_arrangements')
      .update({ notes })
      .eq('id', id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating arrangement notes:", error);
    throw error;
  }
};
