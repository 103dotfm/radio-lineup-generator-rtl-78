
import { supabase } from "@/lib/supabase";
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID, 
  EDITING_FIRST_ROLE_ID, 
  EVENING_PRODUCTION_ROLE_ID 
} from "@/components/admin/producers/components/AssignmentDialog";

// Ensure that all the required roles exist in the database
export const ensureProducerRoles = async () => {
  try {
    const requiredRoles = [
      { id: EDITING_ROLE_ID, name: 'עריכה' },
      { id: PRODUCTION_ROLE_ID, name: 'הפקה' },
      { id: EDITING_FIRST_ROLE_ID, name: 'עריכה ראשית' },
      { id: EVENING_PRODUCTION_ROLE_ID, name: 'הפקת ערב' },
    ];

    // Check which roles already exist
    const { data: existingRoles, error: fetchError } = await supabase
      .from('producer_roles')
      .select('id, name');

    if (fetchError) throw fetchError;

    // Find which roles need to be inserted
    const existingIds = existingRoles?.map(role => role.id) || [];
    const rolesToInsert = requiredRoles.filter(role => !existingIds.includes(role.id));

    if (rolesToInsert.length > 0) {
      console.log(`Adding ${rolesToInsert.length} missing producer roles`);
      const { error: insertError } = await supabase
        .from('producer_roles')
        .upsert(rolesToInsert);

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error("Error ensuring producer roles:", error);
    return false;
  }
};

// Call this function on app initialization
ensureProducerRoles().catch(console.error);
