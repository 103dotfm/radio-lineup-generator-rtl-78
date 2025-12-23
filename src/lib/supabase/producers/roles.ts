import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID, 
  EDITING_FIRST_ROLE_ID, 
  EVENING_PRODUCTION_ROLE_ID 
} from "@/components/admin/producers/components/AssignmentDialog";
import { ProducerRole } from "@/lib/supabase/types/producer.types";
import { apiClient } from "@/lib/api-client";

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

    const response = await apiClient.post('/producer-roles/ensure', { roles: requiredRoles });
    return response.data.success;
  } catch (error) {
    console.error("Error ensuring producer roles:", error);
    return false;
  }
};

// Get producer roles ordered by display_order
export const getProducerRoles = async (): Promise<ProducerRole[]> => {
  try {
    const response = await apiClient.get('/producer-roles');
    return response.data;
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};
