export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      day_notes: {
        Row: {
          created_at: string
          date: string
          id: string
          is_bottom_note: boolean
          note: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_bottom_note?: boolean
          note: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_bottom_note?: boolean
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      digital_employees: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      digital_shift_custom_rows: {
        Row: {
          arrangement_id: string
          content: string | null
          contents: Json | null
          created_at: string | null
          id: string
          position: number
          section_name: string
          updated_at: string | null
        }
        Insert: {
          arrangement_id: string
          content?: string | null
          contents?: Json | null
          created_at?: string | null
          id?: string
          position: number
          section_name: string
          updated_at?: string | null
        }
        Update: {
          arrangement_id?: string
          content?: string | null
          contents?: Json | null
          created_at?: string | null
          id?: string
          position?: number
          section_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_shift_custom_rows_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "digital_work_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_shifts: {
        Row: {
          additional_text: string | null
          arrangement_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_custom_time: boolean | null
          is_hidden: boolean | null
          person_name: string | null
          position: number
          section_name: string
          shift_type: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          additional_text?: string | null
          arrangement_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_custom_time?: boolean | null
          is_hidden?: boolean | null
          person_name?: string | null
          position: number
          section_name: string
          shift_type: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          additional_text?: string | null
          arrangement_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_custom_time?: boolean | null
          is_hidden?: boolean | null
          person_name?: string | null
          position?: number
          section_name?: string
          shift_type?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_shifts_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "digital_work_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_work_arrangements: {
        Row: {
          comic_prompt: string | null
          created_at: string | null
          footer_image_url: string | null
          footer_text: string | null
          id: string
          notes: string | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          comic_prompt?: string | null
          created_at?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          comic_prompt?: string | null
          created_at?: string | null
          footer_image_url?: string | null
          footer_text?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          body_template: string
          created_at: string
          email_method: string | null
          gmail_access_token: string | null
          gmail_client_id: string | null
          gmail_client_secret: string | null
          gmail_redirect_uri: string | null
          gmail_refresh_token: string | null
          gmail_token_expiry: string | null
          id: string
          mailgun_api_key: string | null
          mailgun_domain: string | null
          sender_email: string
          sender_name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          subject_template: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          email_method?: string | null
          gmail_access_token?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_redirect_uri?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id?: string
          mailgun_api_key?: string | null
          mailgun_domain?: string | null
          sender_email: string
          sender_name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_user: string
          subject_template?: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          email_method?: string | null
          gmail_access_token?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_redirect_uri?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          id?: string
          mailgun_api_key?: string | null
          mailgun_domain?: string | null
          sender_email?: string
          sender_name?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_user?: string
          subject_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      interviewees: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          item_id: string
          name: string
          phone: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          item_id: string
          name: string
          phone?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          item_id?: string
          name?: string
          phone?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviewees_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "show_items"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_assignment_skips: {
        Row: {
          assignment_id: string | null
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_assignment_skips_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "producer_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_assignments: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_deleted: boolean | null
          is_recurring: boolean | null
          notes: string | null
          role: string
          slot_id: string
          updated_at: string | null
          week_start: string
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          role: string
          slot_id: string
          updated_at?: string | null
          week_start: string
          worker_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_deleted?: boolean | null
          is_recurring?: boolean | null
          notes?: string | null
          role?: string
          slot_id?: string
          updated_at?: string | null
          week_start?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots_old"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_roles: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      producer_work_arrangements: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          google_id: string | null
          id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          google_id?: string | null
          id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          google_id?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_slots: {
        Row: {
          color: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          has_lineup: boolean | null
          host_name: string | null
          id: string
          is_collection: boolean | null
          is_modified: boolean | null
          is_prerecorded: boolean | null
          show_name: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          show_name: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          show_name?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_slots_backup: {
        Row: {
          color: string | null
          created_at: string | null
          date: string | null
          end_time: string | null
          has_lineup: boolean | null
          host_name: string | null
          id: string | null
          is_collection: boolean | null
          is_modified: boolean | null
          is_prerecorded: boolean | null
          is_recurring: boolean | null
          show_name: string | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          date?: string | null
          end_time?: string | null
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string | null
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          date?: string | null
          end_time?: string | null
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string | null
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name?: string | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      schedule_slots_old: {
        Row: {
          color: string | null
          created_at: string
          day_of_week: number
          end_time: string
          has_lineup: boolean | null
          host_name: string | null
          id: string
          is_collection: boolean | null
          is_deleted: boolean | null
          is_modified: boolean | null
          is_prerecorded: boolean | null
          is_recurring: boolean | null
          show_name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_deleted?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_deleted?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_slots_todelete: {
        Row: {
          color: string | null
          created_at: string
          date: string
          end_time: string
          has_lineup: boolean | null
          host_name: string | null
          id: string
          is_collection: boolean | null
          is_modified: boolean | null
          is_prerecorded: boolean | null
          is_recurring: boolean | null
          show_name: string
          start_time: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          date: string
          end_time: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name: string
          start_time: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          date?: string
          end_time?: string
          has_lineup?: boolean | null
          host_name?: string | null
          id?: string
          is_collection?: boolean | null
          is_modified?: boolean | null
          is_prerecorded?: boolean | null
          is_recurring?: boolean | null
          show_name?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      show_email_logs: {
        Row: {
          error_message: string | null
          id: string
          sent_at: string
          show_id: string
          success: boolean
        }
        Insert: {
          error_message?: string | null
          id?: string
          sent_at?: string
          show_id: string
          success: boolean
        }
        Update: {
          error_message?: string | null
          id?: string
          sent_at?: string
          show_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "show_email_logs_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: true
            referencedRelation: "shows_backup"
            referencedColumns: ["id"]
          },
        ]
      }
      show_items: {
        Row: {
          created_at: string | null
          details: string | null
          duration: number | null
          id: string
          is_break: boolean | null
          is_divider: boolean | null
          is_note: boolean | null
          name: string
          phone: string | null
          position: number
          show_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          duration?: number | null
          id?: string
          is_break?: boolean | null
          is_divider?: boolean | null
          is_note?: boolean | null
          name: string
          phone?: string | null
          position: number
          show_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          duration?: number | null
          id?: string
          is_break?: boolean | null
          is_divider?: boolean | null
          is_note?: boolean | null
          name?: string
          phone?: string | null
          position?: number
          show_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_show_id"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_backup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows_backup"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          name: string
          notes: string | null
          slot_id: string | null
          time: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          name: string
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          name?: string
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Relationships: []
      }
      shows_backup: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          name: string | null
          notes: string | null
          slot_id: string | null
          time: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id: string
          name?: string | null
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_slot_id"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots_old"
            referencedColumns: ["id"]
          },
        ]
      }
      shows_todelete: {
        Row: {
          created_at: string | null
          date: string | null
          id: string
          name: string
          notes: string | null
          slot_id: string | null
          time: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          id?: string
          name: string
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          id?: string
          name?: string
          notes?: string | null
          slot_id?: string | null
          time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots_todelete"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      work_arrangements: {
        Row: {
          created_at: string | null
          filename: string
          id: string
          type: string
          updated_at: string | null
          url: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          filename: string
          id?: string
          type: string
          updated_at?: string | null
          url: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          filename?: string
          id?: string
          type?: string
          updated_at?: string | null
          url?: string
          week_start?: string
        }
        Relationships: []
      }
      worker_divisions: {
        Row: {
          created_at: string
          division_id: string
          id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_divisions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          name: string
          password_readable: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          name: string
          password_readable?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          password_readable?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_schedule_slots_columns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      add_slots_to_date_range: {
        Args: {
          p_color?: string
          p_day_of_week: number
          p_end_date: string
          p_end_time: string
          p_host_name: string
          p_is_collection?: boolean
          p_is_prerecorded?: boolean
          p_show_name: string
          p_start_date: string
          p_start_time: string
        }
        Returns: undefined
      }
      check_table_exists: {
        Args: { table_name: string }
        Returns: boolean
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      insert_show_items: {
        Args: { items_array: Json }
        Returns: {
          created_at: string | null
          details: string | null
          duration: number | null
          id: string
          is_break: boolean | null
          is_divider: boolean | null
          is_note: boolean | null
          name: string
          phone: string | null
          position: number
          show_id: string | null
          title: string | null
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
