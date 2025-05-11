
// Define all producer-related types in a central location
export interface ProducerRole {
  id: string;
  name: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProducerAssignment {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  notes?: string | null;
  is_recurring?: boolean;
  created_at?: string;
  updated_at?: string;
  worker?: Worker;
  slot?: ScheduleSlot;
}

export interface Worker {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  password_readable?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleSlot {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ProducerWorkArrangement {
  id: string;
  week_start: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}
