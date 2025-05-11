
export type ProducerAssignment = {
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
};

export type ProducerRole = {
  id: string;
  name: string;
  display_order?: number; // Added display_order property
  created_at?: string;
  updated_at?: string;
};

export type ProducerWorkArrangement = {
  id: string;
  week_start: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ScheduleSlot = {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type Worker = {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
};
