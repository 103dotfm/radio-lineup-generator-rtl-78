
export type ViewMode = 'daily' | 'weekly' | 'monthly';

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
  shows?: Array<{
    id: string;
    name: string;
    time?: string;
    date?: string;
    notes?: string;
    created_at?: string;
  }> | null;
}

export interface DayNote {
  id: string;
  date: string; // Format: YYYY-MM-DD
  note: string;
  created_at?: string;
  updated_at?: string;
}

export interface DigitalWorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  comic_prompt: string | null;
  comic_image_url: string | null;
  created_at?: string;
  updated_at?: string;
}
