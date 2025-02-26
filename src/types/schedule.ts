
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
  created_at?: string;
  updated_at?: string;
}
