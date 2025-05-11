
import { supabase } from "@/lib/supabase";
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID, 
  EDITING_FIRST_ROLE_ID, 
  EVENING_PRODUCTION_ROLE_ID 
} from "@/components/admin/producers/components/AssignmentDialog";
import type { ProducerRole } from "../types/producer.types";

// Ensure that all the required roles exist in the database
export const ensureProducerRoles = async () => {
  try {
    // Define roles in the specific order we want them to appear
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

    // Find which roles need to be inserted
    const existingIds = existingRoles?.map(role => role.id) || [];
    const rolesToInsert = requiredRoles.filter(role => !existingIds.includes(role.id));

    if (rolesToInsert.length > 0) {
      console.log(`Adding ${rolesToInsert.length} missing producer roles`);
      
      const { error: insertError } = await supabase
        .from('producer_roles')
        .insert(rolesToInsert as any);

      if (insertError) throw insertError;
    }

    // Update existing roles to ensure they have the correct display_order
    for (const role of requiredRoles) {
      if (existingIds.includes(role.id)) {
        const { error: updateError } = await supabase
          .from('producer_roles')
          .update({ display_order: role.display_order } as any)
          .eq('id', role.id);

        if (updateError) {
          console.error(`Error updating display order for role ${role.name}:`, updateError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error ensuring producer roles:", error);
    return false;
  }
};

// Get producer roles sorted by display_order
export const getProducerRoles = async (): Promise<ProducerRole[]> => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('display_order', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    return [];
  }
};
