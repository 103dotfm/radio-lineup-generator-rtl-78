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
  slot_date: string;  // The actual date of the slot
  day_of_week: number;  // Day of week (0-6, where 0 is Sunday)
  color?: string;
  is_prerecorded?: boolean;
  is_collection?: boolean;
  is_master?: boolean;  // Whether this is a template slot
  is_recurring?: boolean;  // Whether this is a recurring slot
  parent_slot_id?: string;  // Reference to master slot if this is a copy
  is_deleted?: boolean;
  has_lineup?: boolean;
  additional_text?: string;
  is_custom_time?: boolean;
  position?: number;
  shows?: any[];
  created_at?: string;
  updated_at?: string;
  is_modified?: boolean;  // Whether this slot has been modified from its template
  // RDS fields
  rds_pty?: number;  // Program Type (1=NEWS, 4=SPORTS, 21=PHONE-IN, 26=NATIONAL MUSIC, 17=FINANCE, 0=NONE)
  rds_ms?: number;   // Music/Speech (0=SPEECH ONLY, 1=MUSIC PROGRAMMING)
  rds_radio_text?: string;  // Radio Text (up to 64 characters)
  rds_radio_text_translated?: string;  // Translated radio text
}

export interface RDSSettings {
  id: string;
  send_rds_on_program_change: boolean;
  rds_rt2: string;
  rds_rt3: string;
  default_rt1: string;
  override_enabled: boolean;
  override_pty?: number;
  override_ms?: number;
  override_rt1?: string;
  created_at: string;
  updated_at: string;
}

export interface RDSData {
  pty: number;
  ms: number;
  radio_text: string;
  rt2: string;
  rt3: string;
}

export interface TranslationMapping {
  id: string;
  hebrew_text: string;
  english_text: string;
  created_at: string;
  updated_at: string;
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
  worker?: {
    id: string;
    name: string;
    position?: string;
    email?: string;
    phone?: string;
  };
  slot?: {
    id: string;
    show_name: string;
    host_name?: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
  };
}

export interface DayNote {
  id: string;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
  is_bottom_note?: boolean;
}
