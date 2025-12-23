import { ProducerRole } from '@/lib/supabase/types/producer.types';
import { apiClient } from '../api-client';

// Ensure that all the required roles exist in the database with correct display order
export const ensureProducerRoles = async (): Promise<boolean> => {
  try {
    const response = await apiClient.post('/producer-roles/ensure');
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