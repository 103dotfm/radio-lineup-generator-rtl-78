
import { supabase } from "@/integrations/supabase/client";
import { DayNote } from "@/types/schedule";
import { format } from "date-fns";

export const getDayNotes = async (startDate: Date, endDate: Date): Promise<DayNote[]> => {
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');
  
  console.log(`Fetching day notes from ${formattedStartDate} to ${formattedEndDate}`);
  
  const { data, error } = await supabase
    .from('day_notes')
    .select('*')
    .gte('date', formattedStartDate)
    .lte('date', formattedEndDate);
    
  if (error) {
    console.error('Error fetching day notes:', error);
    return [];
  }
  
  return data as DayNote[];
};

export const createDayNote = async (date: Date, note: string): Promise<DayNote | null> => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  const { data, error } = await supabase
    .from('day_notes')
    .insert({
      date: formattedDate,
      note
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating day note:', error);
    return null;
  }
  
  return data as DayNote;
};

export const updateDayNote = async (id: string, note: string): Promise<DayNote | null> => {
  const { data, error } = await supabase
    .from('day_notes')
    .update({ note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating day note:', error);
    return null;
  }
  
  return data as DayNote;
};

export const deleteDayNote = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('day_notes')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting day note:', error);
    return false;
  }
  
  return true;
};
