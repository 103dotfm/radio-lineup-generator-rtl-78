
export type ViewMode = 'daily' | 'weekly' | 'monthly';

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  has_lineup?: boolean;
  is_modified?: boolean;
  created_at?: string;
  updated_at?: string;
}
