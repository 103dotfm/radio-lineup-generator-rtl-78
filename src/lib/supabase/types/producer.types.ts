
import { Worker, ScheduleSlot } from "@/types/schedule";

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
