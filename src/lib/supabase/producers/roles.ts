
import { supabase } from "@/lib/supabase";
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID, 
  EDITING_FIRST_ROLE_ID, 
  EVENING_PRODUCTION_ROLE_ID 
} from "@/components/admin/producers/components/AssignmentDialog";
import { ProducerRole } from "@/lib/supabase/types/producer.types";

// Ensure that all the required roles exist in the database with correct display order
export const ensureProducerRoles = async () => {
  try {
    // First check if the db_helper_functions migration has been run
    const { data: tableExists } = await supabase.rpc('check_table_exists', { 
      table_name: 'producer_roles'
    });

    // If the table doesn't exist yet, we can't proceed
    if (!tableExists) {
      console.error("Producer roles table doesn't exist yet");
      return false;
    }

    // Use the execute_sql edge function instead of direct RPC
    const { data: columnCheckResult, error: columnCheckError } = await supabase.functions
      .invoke('execute_sql', {
        body: { sql_query: "SELECT column_exists('producer_roles', 'display_order')" }
      });

    if (columnCheckError) {
      console.error("Error checking if display_order column exists:", columnCheckError);
      throw columnCheckError;
    }

    // Safely extract the boolean value with proper type checking
    let columnExists = false;
    if (columnCheckResult && 
        Array.isArray(columnCheckResult.data) && 
        columnCheckResult.data.length > 0 && 
        columnCheckResult.data[0] && 
        typeof columnCheckResult.data[0].column_exists === 'boolean') {
      columnExists = columnCheckResult.data[0].column_exists;
    }
    
    if (!columnExists) {
      console.log("Adding display_order column to producer_roles table");
      const { error: alterError } = await supabase.functions
        .invoke('execute_sql', {
          body: { sql_query: 'ALTER TABLE producer_roles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999' }
        });
      
      if (alterError) {
        console.error("Error adding display_order column:", alterError);
        throw alterError;
      }
      
      console.log("Added display_order column");
    }

    // Define required roles with their display order
    const requiredRoles = [
      { id: EDITING_ROLE_ID, name: 'עריכה', display_order: 1 },
      { id: PRODUCTION_ROLE_ID, name: 'הפקה', display_order: 2 },
      { id: EDITING_FIRST_ROLE_ID, name: 'עריכה ראשית', display_order: 3 },
      { id: EVENING_PRODUCTION_ROLE_ID, name: 'הפקת ערב', display_order: 4 },
    ];

    // Check which roles already exist
    const { data: existingRoles, error: fetchError } = await supabase
      .from('producer_roles')
      .select('id, name, display_order');

    if (fetchError) {
      console.error("Error fetching producer roles:", fetchError);
      throw fetchError;
    }

    // Find which roles need to be inserted or updated
    const existingIds = existingRoles?.map(role => role.id) || [];
    const rolesToUpsert = requiredRoles.map(role => {
      const existing = existingRoles?.find(er => er.id === role.id);
      // If role exists but has different display_order, update it
      if (existing && existing.display_order !== role.display_order) {
        return { ...role };
      }
      // If role doesn't exist, insert it
      if (!existingIds.includes(role.id)) {
        return role;
      }
      return null;
    }).filter(Boolean);

    if (rolesToUpsert.length > 0) {
      console.log(`Adding or updating ${rolesToUpsert.length} producer roles`);
      const { error: upsertError } = await supabase
        .from('producer_roles')
        .upsert(rolesToUpsert);

      if (upsertError) throw upsertError;
    }

    return true;
  } catch (error) {
    console.error("Error ensuring producer roles:", error);
    return false;
  }
};

// Get producer roles ordered by display_order
export const getProducerRoles = async () => {
  try {
    // Use direct query with proper error handling for the column check
    const { data: columnCheckResult, error: columnCheckError } = await supabase.functions
      .invoke('execute_sql', {
        body: { sql_query: "SELECT column_exists('producer_roles', 'display_order')" }
      });

    if (columnCheckError) {
      console.error("Error checking if display_order column exists:", columnCheckError);
      throw columnCheckError;
    }

    // Safely extract the boolean value with proper type checking
    let columnExists = false;
    if (columnCheckResult && 
        Array.isArray(columnCheckResult.data) && 
        columnCheckResult.data.length > 0 && 
        columnCheckResult.data[0] && 
        typeof columnCheckResult.data[0].column_exists === 'boolean') {
      columnExists = columnCheckResult.data[0].column_exists;
    }
    
    let query = supabase.from('producer_roles').select('*');
    
    // Only order by display_order if the column exists
    if (columnExists) {
      query = query.order('display_order');
    } else {
      console.warn("display_order column not found in producer_roles table");
    }
    
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};
