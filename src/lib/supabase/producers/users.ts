
import { supabase } from "@/lib/supabase";

export const createProducerUser = async (workerId: string, email: string) => {
  try {
    // Log attempt to create user
    console.log("Starting producer user creation process:", { workerId, email });
    
    if (!workerId || !email) {
      console.error("Missing required parameters:", { workerId, email });
      return { 
        success: false, 
        message: 'Missing required parameters. Both worker ID and email must be provided.' 
      };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return {
        success: false,
        message: 'Invalid email format. Please provide a valid email address.'
      };
    }
    
    // Call the edge function to create a user
    console.log("Invoking edge function with params:", { worker_id: workerId, email });
    const { data, error } = await supabase.functions.invoke('create-producer-user', {
      body: { worker_id: workerId, email },
    });
    
    if (error) {
      console.error("Edge function error:", error);
      
      // If there's context with response data, try to extract more details
      let errorMessage = error.message || "Failed to create user";
      let errorDetails = null;
      
      if (error.context && error.context.response) {
        try {
          // Try to parse error response
          const responseData = await error.context.response.json();
          console.error("Error response data:", responseData);
          
          // Use the custom error message from the edge function if available
          if (responseData.message) {
            errorMessage = responseData.message;
          }
          
          errorDetails = responseData;
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
        }
      }
      
      // Enhanced error logging for debugging
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error.constructor?.name);
      console.error("Error properties:", Object.keys(error));
      
      return { 
        success: false, 
        message: errorMessage,
        details: errorDetails
      };
    }
    
    // Log the response for debugging
    console.log("Edge function response:", data);
    
    if (!data) {
      console.error("Edge function returned no data");
      return { 
        success: false, 
        message: 'No data returned from server' 
      };
    }
    
    return data;
  } catch (error: any) {
    console.error("Error creating producer user:", error);
    
    // Try to extract more details about the error
    let errorMessage = error.message || "Failed to create user";
    let errorDetails = null;
    
    // Enhanced error logging
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor?.name);
    console.error("Error properties:", Object.keys(error));
    
    // Check if there's response data with more details
    if (error.context && error.context.response) {
      try {
        const responseData = await error.context.response.json();
        console.error("Error response data:", responseData);
        if (responseData.message) {
          errorMessage = responseData.message;
        }
        errorDetails = responseData;
      } catch (parseError) {
        console.error("Could not parse error response:", parseError);
      }
    }
    
    return { 
      success: false, 
      message: errorMessage,
      details: errorDetails
    };
  }
};

export const resetProducerPassword = async (workerId: string) => {
  try {
    if (!workerId) {
      console.error("Missing required parameter: workerId");
      return { 
        success: false, 
        message: 'Missing required parameter: worker ID' 
      };
    }
    
    // Call the edge function to reset a password
    console.log("Invoking reset password function with params:", { worker_id: workerId });
    const { data, error } = await supabase.functions.invoke('reset-producer-password', {
      body: { worker_id: workerId },
    });
    
    if (error) {
      console.error("Edge function error:", error);
      
      // Try to extract more details about the error
      let errorMessage = error.message || "Failed to reset password";
      let errorDetails = null;
      
      if (error.context && error.context.response) {
        try {
          const responseData = await error.context.response.json();
          console.error("Error response data:", responseData);
          if (responseData.message) {
            errorMessage = responseData.message;
          }
          errorDetails = responseData;
        } catch (parseError) {
          console.error("Could not parse error response:", parseError);
        }
      }
      
      return { 
        success: false, 
        message: errorMessage,
        details: errorDetails
      };
    }
    
    // Log the response for debugging
    console.log("Edge function response:", data);
    
    if (!data) {
      console.error("Edge function returned no data");
      return { 
        success: false, 
        message: 'No data returned from server' 
      };
    }
    
    return data;
  } catch (error: any) {
    console.error("Error resetting producer password:", error);
    
    // Enhanced error logging
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor?.name);
    console.error("Error properties:", Object.keys(error));
    
    // Try to extract more details about the error
    let errorMessage = error.message || "Failed to reset password";
    let errorDetails = null;
    
    // Check if there's response data with more details
    if (error.context && error.context.response) {
      try {
        const responseData = await error.context.response.json();
        console.error("Error response data:", responseData);
        if (responseData.message) {
          errorMessage = responseData.message;
        }
        errorDetails = responseData;
      } catch (parseError) {
        console.error("Could not parse error response:", parseError);
      }
    }
    
    return { 
      success: false, 
      message: errorMessage,
      details: errorDetails
    };
  }
};
