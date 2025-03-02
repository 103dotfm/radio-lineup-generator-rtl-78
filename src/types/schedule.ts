
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
  }>;
}
