
// Type definitions for scheduling components

export interface DigitalWorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
}

export interface DigitalWorkArrangementViewProps {
  selectedDate: Date;
  weekDate?: string;
  isEditable?: boolean;
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
  start_time: string;
  end_time: string;
  day_of_week: number;
  color?: string;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  is_modified?: boolean;
  is_deleted?: boolean;
  is_recurring?: boolean;
  has_lineup?: boolean;
  additional_text?: string;
  is_custom_time?: boolean;
  position?: number;
  slot_date?: string; // Date for specific slot instances
  parent_slot_id?: string; // Reference to parent/master slot
  shows?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface ProducerAssignment {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  notes?: string;
  is_recurring: boolean;
  week_start: string;
  worker?: {
    id: string;
    name: string;
    position?: string;
  };
  slot?: ScheduleSlot | null;
  created_at?: string;
  updated_at?: string;
}

export interface DayNote {
  id: string;
  date: string;
  note: string;
}
