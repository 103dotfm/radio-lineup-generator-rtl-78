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
    // Define required roles with their display order
    const requiredRoles = [
      { id: EDITING_ROLE_ID, name: 'עריכה', display_order: 1 },
      { id: PRODUCTION_ROLE_ID, name: 'הפקה', display_order: 2 },
      { id: EDITING_FIRST_ROLE_ID, name: 'עריכה ראשית', display_order: 3 },
      { id: EVENING_PRODUCTION_ROLE_ID, name: 'הפקת ערב', display_order: 4 },
    ];

    // Get existing roles
    const { data: existingRoles, error: fetchError } = await supabase
      .from('producer_roles')
      .select('id');

    if (fetchError) {
      console.error("Error fetching existing roles:", fetchError);
      throw fetchError;
    }

    // Find roles that don't exist yet
    const existingIds = new Set(existingRoles?.map(role => role.id) || []);
    const rolesToInsert = requiredRoles.filter(role => !existingIds.has(role.id));

    // Insert only missing roles
    if (rolesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('producer_roles')
        .insert(rolesToInsert);

      if (insertError) {
        console.error("Error inserting roles:", insertError);
        throw insertError;
      }
    }

    // Update all roles to ensure correct names and display order
    for (const role of requiredRoles) {
      const { error: updateError } = await supabase
        .from('producer_roles')
        .update({ name: role.name, display_order: role.display_order })
        .eq('id', role.id);

      if (updateError) {
        console.error(`Error updating role ${role.name}:`, updateError);
        throw updateError;
      }
    }

    return true;
  } catch (error) {
    console.error("Error ensuring producer roles:", error);
    return false;
  }
};

// Get producer roles ordered by display_order
export const getProducerRoles = async (): Promise<ProducerRole[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('display_order');

    if (error) {
      console.error("Error fetching producer roles:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};
