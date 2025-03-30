
export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  start_time: string;
  end_time: string;
  day_of_week: number; // Added for backward compatibility with UI
  is_recurring?: boolean; // Added for backward compatibility with UI
  is_prerecorded?: boolean;
  is_collection?: boolean;
  is_modified?: boolean;
  has_lineup?: boolean;
  color?: string;
  created_at?: string;
  updated_at?: string;
  date?: string; // New field from updated schema
  shows?: Array<{
    id: string;
    name: string;
    time?: string;
    date?: string;
    notes?: string;
    created_at?: string;
  }> | [];
}

export interface DayNote {
  id: string;
  date: string; // Format: YYYY-MM-DD
  note: string;
  created_at?: string;
  updated_at?: string;
}
