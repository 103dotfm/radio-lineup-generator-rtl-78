
import { PostgrestQueryBuilder } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Helper function to safely query supabase tables that might not be in the TypeScript definitions
 * This allows us to query tables that exist in the database but aren't in the generated types
 */
export function safeTableQuery(tableName: string): PostgrestQueryBuilder<any, any, any> {
  return supabase.from(tableName as any);
}

/**
 * Maps old table names to current table names for backward compatibility
 */
export const TABLE_NAMES = {
  shows: "shows_backup",
  schedule_slots: "schedule_slots_old",
  // Add more mappings as needed
};

/**
 * Gets the correct table name based on our mapping
 */
export function getTableName(name: string): string {
  return TABLE_NAMES[name as keyof typeof TABLE_NAMES] || name;
}
