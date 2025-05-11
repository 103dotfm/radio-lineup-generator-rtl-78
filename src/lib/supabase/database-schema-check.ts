
import { supabase } from "@/lib/supabase";

// This function will check if display_order column exists in producer_roles table
// and add it if it doesn't
export const ensureProducerRolesDisplayOrder = async () => {
  try {
    // Check if the column exists using information_schema
    const { data, error } = await supabase.rpc('check_table_exists', {
      table_name: 'producer_roles'
    });
    
    if (error) {
      console.error('Error checking for producer_roles table:', error);
      return false;
    }
    
    if (!data) {
      console.error('producer_roles table does not exist');
      return false;
    }
    
    // If the table exists, check for the display_order column
    const { data: columnExists, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'producer_roles')
      .eq('column_name', 'display_order')
      .single();
      
    if (columnError && columnError.code !== 'PGRST116') {
      // If error is not "no rows returned", then something else went wrong
      console.error('Error checking for display_order column:', columnError);
      return false;
    }
    
    // If column doesn't exist, add it
    if (!columnExists || columnError?.code === 'PGRST116') {
      console.log('Adding display_order column to producer_roles table');
      const { error: alterError } = await supabase.rpc('add_display_order_to_producer_roles');
      
      if (alterError) {
        console.error('Error adding display_order column:', alterError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring producer_roles display_order column:', error);
    return false;
  }
};

// Call this function when the application starts
export const initializeDatabaseSchema = () => {
  ensureProducerRolesDisplayOrder().catch(console.error);
};
