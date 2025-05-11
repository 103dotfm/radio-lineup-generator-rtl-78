
import { supabase } from "@/lib/supabase";

export const createProducerUser = async (workerId: string, email: string) => {
  try {
    // Call the edge function to create a user
    console.log("Invoking edge function with params:", { worker_id: workerId, email });
    const { data, error } = await supabase.functions.invoke('create-producer-user', {
      body: { worker_id: workerId, email },
    });
    
    if (error) {
      console.error("Edge function error:", error);
      throw error;
    }
    
    // Log the response for debugging
    console.log("Edge function response:", data);
    return data || { success: false, message: 'Unknown error' };
  } catch (error: any) {
    console.error("Error creating producer user:", error);
    return { 
      success: false, 
      message: error.message || "Failed to create user" 
    };
  }
};

export const resetProducerPassword = async (workerId: string) => {
  try {
    // Call the edge function to reset a password
    console.log("Invoking reset password function with params:", { worker_id: workerId });
    const { data, error } = await supabase.functions.invoke('reset-producer-password', {
      body: { worker_id: workerId },
    });
    
    if (error) {
      console.error("Edge function error:", error);
      throw error;
    }
    
    // Log the response for debugging
    console.log("Edge function response:", data);
    return data || { success: false, message: 'Unknown error' };
  } catch (error: any) {
    console.error("Error resetting producer password:", error);
    return { 
      success: false, 
      message: error.message || "Failed to reset password" 
    };
  }
};
