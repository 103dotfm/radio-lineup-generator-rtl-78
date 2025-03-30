
export interface Show {
  id: string;
  name: string;
  date: string;
  time: string;
  notes?: string;
  slot_id?: string;
  created_at?: string;
}

export interface ShowItem {
  id: string;
  show_id: string;
  name: string;
  position: number;
  title?: string;
  details?: string;
  phone?: string;
  duration?: number;
  is_break?: boolean;
  is_note?: boolean;
  is_divider?: boolean;
  created_at?: string;
  interviewees?: Interviewee[];
}

export interface Interviewee {
  id: string;
  item_id: string;
  name: string;
  title?: string;
  phone?: string;
  duration?: number;
  created_at?: string;
}

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_recurring: boolean;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  has_lineup?: boolean;
  is_modified?: boolean;
  is_deleted?: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
  date?: string; // Some slots might have a date rather than day_of_week
  shows?: Show[] | null;
}
