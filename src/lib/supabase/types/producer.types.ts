
import { ScheduleSlot } from '@/types/schedule';

export type ProducerRole = {
  id: string;
  name: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type ProducerAssignment = {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  end_date?: string; // Optional end date for recurring assignments
  notes?: string | null;
  is_recurring?: boolean;
  created_at?: string;
  updated_at?: string;
  worker?: Worker;
  slot?: ScheduleSlot;
};

export type ProducerWorkArrangement = {
  id: string;
  week_start: Date;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};
