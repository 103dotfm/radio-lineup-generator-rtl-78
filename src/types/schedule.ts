
export interface ScheduleSlot {
  id: string;
  show_name: string;
  day_of_week: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:mm format
  end_time: string;
  is_recurring: boolean;
  host_name?: string;
  created_at?: string;
  updated_at?: string;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';
