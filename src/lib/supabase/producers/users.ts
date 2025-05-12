
import { supabase } from "@/lib/supabase";

export const createProducerUser = async (workerId: string, email: string) => {
  try {
    // Enhanced logging and validation
    console.log("Starting producer user creation process:", { workerId, email });
    
    // Validate required parameters with proper error handling
    if (!workerId || !workerId.trim()) {
      console.error("Missing required parameter: workerId");
      return { 
        success: false, 
        message: 'Missing worker ID. Please select a valid worker.' 
      };
    }
    
    if (!email || !email.trim()) {
      console.error("Missing required parameter: email");
      return { 
        success: false, 
        message: 'Missing email address. Please enter a valid email.' 
      };
    }
    
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return {
        success: false,
        message: 'Invalid email format. Please provide a valid email address.'
      };
    }
    
    console.log("Validations passed, proceeding with edge function call");
    
    // Call the edge function with robust error handling
    try {
      const { data, error } = await supabase.functions.invoke('create-producer-user', {
        body: { 
          worker_id: workerId, 
          email: email.trim() 
        },
      });
      
      if (error) {
        console.error("Edge function error:", error);
        
        let errorMessage = "Failed to create user";
        let errorDetails = null;
        
        // Try to extract more information from the error response
        if (error.message) {
          errorMessage = error.message;
        }
        
        if (error.context && error.context.response) {
          try {
            const responseData = await error.context.response.json();
            console.log("Error response data:", responseData);
            
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
      
      console.log("Edge function response:", data);
      
      if (!data) {
        return { 
          success: false, 
          message: 'No data returned from server' 
        };
      }
      
      return data;
    } catch (invocationError) {
      console.error("Error invoking edge function:", invocationError);
      return {
        success: false,
        message: invocationError.message || "Failed to communicate with server",
        details: { error: invocationError }
      };
    }
  } catch (error) {
    console.error("Unexpected error in createProducerUser:", error);
    return { 
      success: false, 
      message: error.message || "An unexpected error occurred",
      details: { error }
    };
  }
};

export const resetProducerPassword = async (workerId: string) => {
  try {
    if (!workerId || !workerId.trim()) {
      console.error("Missing required parameter: workerId");
      return { 
        success: false, 
        message: 'Missing worker ID' 
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
  } catch (error) {
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
