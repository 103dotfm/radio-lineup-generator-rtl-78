
import { supabase } from "@/lib/supabase";

// This function will check if display_order column exists in producer_roles table
// and add it if it doesn't
export const ensureProducerRolesDisplayOrder = async () => {
  try {
    // Check if the table exists using information_schema
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
    
    // Try to select a row with display_order to check if the column exists
    try {
      const { data: columnData, error: columnError } = await supabase
        .from('producer_roles')
        .select('display_order')
        .limit(1);
      
      // If we get here without error, the column exists
      console.log('display_order column exists in producer_roles');
      return true;
    } catch (error) {
      // If there's an exception, check if it's because the column doesn't exist
      console.log('Error checking for display_order column, may not exist:', error);
      
      // Call the edge function to add the column
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('add-display-order-column');
      
      if (functionError) {
        console.error('Error adding display_order column:', functionError);
        return false;
      }
      
      console.log('Display order column added successfully:', functionResult);
      return true;
    }
  } catch (error) {
    console.error('Error ensuring producer_roles display_order column:', error);
    return false;
  }
};

// Call this function when the application starts
export const initializeDatabaseSchema = () => {
  ensureProducerRolesDisplayOrder().catch(console.error);
};
