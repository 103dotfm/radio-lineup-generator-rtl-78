
// Type definitions for scheduling components

export interface DigitalWorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  comic_prompt: string | null;
  comic_image_url: string | null;
}

export interface ShiftWorker {
  id: string;
  name: string;
  email?: string;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  is_modified?: boolean;
  has_lineup?: boolean;
  color?: string;
  shows?: any[];
}

export interface DayNote {
  id: string;
  date: string;
  note: string;
  created_at?: string;
  updated_at?: string;
}
