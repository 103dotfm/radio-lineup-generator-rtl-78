
export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string | null;
  start_time: string;
  end_time: string;
  date: string;
  is_recurring?: boolean | null;
  is_prerecorded?: boolean | null;
  is_collection?: boolean | null;
  has_lineup?: boolean | null;
  is_modified?: boolean | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
  day_of_week?: number;
  is_deleted?: boolean | null;
  shows?: Array<{
    id: string;
    name: string;
    time?: string | null;
    date?: string | null;
    notes?: string | null;
    created_at?: string | null;
    slot_id?: string | null;
  }>;
}

export interface DayNote {
  id: string;
  date: string; // Format: YYYY-MM-DD
  note: string;
  created_at?: string;
  updated_at?: string;
}
