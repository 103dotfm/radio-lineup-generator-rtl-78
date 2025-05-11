
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

    if (fetchError) throw fetchError;

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
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};

// Call this function on app initialization
ensureProducerRoles().catch(console.error);
