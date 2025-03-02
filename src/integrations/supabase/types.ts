export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      schedule_slots: {
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
            foreignKeyName: "show_items_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
        Relationships: [
          {
            foreignKeyName: "shows_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_schedule_slots_columns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      insert_show_items: {
        Args: {
          items_array: Json
        }
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
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
