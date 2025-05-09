
import { supabase } from "@/lib/supabase";

export const getProducers = async () => {
  try {
    console.log('producers.ts: Fetching workers from Supabase...');
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    console.log(`Workers data fetched successfully: ${data?.length} workers`, data);
    return data;
  } catch (error) {
    console.error("Error fetching producers:", error);
    throw error;
  }
};

export const getProducerRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('producer_roles')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching producer roles:", error);
    throw error;
  }
};
