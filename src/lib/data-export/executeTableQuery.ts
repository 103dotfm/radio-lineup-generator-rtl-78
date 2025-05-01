
import { supabase } from '@/lib/supabase';

// Helper function to execute a SQL query directly for tables that might not be in TypeScript definitions
const executeTableQuery = async (tableName: string, filters: Record<string, any> = {}) => {
  try {
    // Build a dynamic query using the from method with type assertion
    let query = supabase
      .from(tableName as any)
      .select('*');
    
    // Add filters if they exist
    if (Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (Array.isArray(value)) {
          // For IN conditions
          query = (query as any).in(key, value);
        } else {
          // For equality conditions
          query = (query as any).eq(key, value);
        }
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error executing query for ${tableName}:`, error);
    throw error;
  }
};

export default executeTableQuery;
