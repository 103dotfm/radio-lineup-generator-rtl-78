
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
    
    // If the table exists, check for the display_order column
    // Using raw SQL query to avoid type errors with information_schema
    const { data: columnData, error: columnError } = await supabase
      .from('producer_roles')
      .select('display_order')
      .limit(1)
      .single();
      
    if (columnError && columnError.code === 'PGRST116') {
      // If no rows exist, that's fine
      console.log('No producer roles found, but column check will continue');
    } else if (columnError && columnError.message?.includes('column "display_order" does not exist')) {
      // Column doesn't exist, let's add it by calling our edge function
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('add-display-order-column');
      
      if (functionError) {
        console.error('Error adding display_order column:', functionError);
        return false;
      }
      
      console.log('Display order column added successfully:', functionResult);
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
