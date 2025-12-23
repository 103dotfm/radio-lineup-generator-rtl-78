export interface ProducerAssignment {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  is_recurring: boolean;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // New fields for robust recurring assignment matching
  day_of_week?: number;
  start_time?: string;
  show_name?: string;
}

export interface ProducerAssignmentSkip {
  id: string;
  assignment_id: string;
  week_start: string;
  created_at: string;
  updated_at: string;
}

export interface ProducerRole {
  id: string;
  name: string;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

// Define the base Database type
export interface Database {
  public: {
    Tables: {
      producer_assignments: {
        Row: ProducerAssignment;
        Insert: Omit<ProducerAssignment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProducerAssignment, 'id'>>;
      };
      producer_assignment_skips: {
        Row: ProducerAssignmentSkip;
        Insert: Omit<ProducerAssignmentSkip, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProducerAssignmentSkip, 'id'>>;
      };
      producer_roles: {
        Row: ProducerRole;
        Insert: Omit<ProducerRole, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProducerRole, 'id'>>;
      };
    };
    Functions: {
      check_table_exists: {
        Args: { table_name: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

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
