
import { supabase } from '@/lib/supabase';

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  color?: string;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  is_modified?: boolean;
  is_deleted?: boolean;
  is_recurring?: boolean;
  has_lineup?: boolean;
  additional_text?: string;
  is_custom_time?: boolean;
  position?: number;
  slot_date?: string;
  parent_slot_id?: string;
  shows?: any[];
  created_at?: string;
  updated_at?: string;
  assignments?: any[];
}

export const fetchScheduleSlots = async (): Promise<ScheduleSlot[]> => {
  try {
    console.log('Fetching schedule slots');
    const { data, error } = await supabase
      .from('schedule_slots')
      .select('*')
      .order('start_time');

    if (error) {
      console.error('Error fetching schedule slots:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchScheduleSlots:', error);
    return [];
  }
};
