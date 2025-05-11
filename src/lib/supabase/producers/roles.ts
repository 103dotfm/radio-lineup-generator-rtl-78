
import { supabase } from "@/lib/supabase";
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID, 
  EDITING_FIRST_ROLE_ID, 
  EVENING_PRODUCTION_ROLE_ID 
} from "@/components/admin/producers/components/AssignmentDialog";

// Ensure that all the required roles exist in the database with correct display order
export const ensureProducerRoles = async () => {
  try {
    // First, check if display_order column exists, if not add it
    const { data: columnExists } = await supabase.rpc('column_exists', { 
      table_name: 'producer_roles',
      column_name: 'display_order'
    }).single();

    if (!columnExists) {
      console.log("Adding display_order column to producer_roles table");
      await supabase.rpc('execute_sql', { 
        sql_query: 'ALTER TABLE producer_roles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999'
      });
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
    // Check if display_order column exists
    const { data: columnExists } = await supabase.rpc('column_exists', { 
      table_name: 'producer_roles',
      column_name: 'display_order'
    }).single();

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
