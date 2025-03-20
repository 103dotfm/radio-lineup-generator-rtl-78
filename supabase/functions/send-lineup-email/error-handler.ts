
export interface ErrorDetails {
  stage: string;
  message: string;
  stack?: string;
  code?: string;
  command?: string;
  responseCode?: string;
  response?: string;
  recommendation?: string;
  additionalInfo?: string;
}

export const createErrorLog = (stage: string, error: any): ErrorDetails => {
  const errorDetails: ErrorDetails = {
    stage,
    message: error.message || 'Unknown error',
    stack: error.stack,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode || error.status || error.statusCode,
    response: typeof error.response === 'string' ? error.response : JSON.stringify(error.response || {}),
    additionalInfo: error.additionalInfo
  };
  
  // Add recommendations based on error context
  if (stage === "MAILGUN_SENDING") {
    errorDetails.recommendation = "Verify your Mailgun API key and domain in the Supabase Edge Function secrets. Ensure your Mailgun account is active and the domain is verified.";
    
    if (error.response && typeof error.response === 'string') {
      if (error.response.includes("domain not found") || error.response.includes("not authorized")) {
        errorDetails.recommendation = "The domain you specified was not found or you're not authorized to send from it. Please check that the MAILGUN_DOMAIN environment variable is set correctly and that the domain is verified in your Mailgun account.";
      }
      
      if (error.status === 401) {
        errorDetails.recommendation = "Authentication failed. Make sure your Mailgun API key is correct. API keys should start with 'key-' for standard API keys.";
      }
    }
  } else if (stage === "SMTP_VERIFICATION" || stage === "SENDING_EMAIL") {
    if (isOutlookAuthError(error)) {
      errorDetails.recommendation = getAlternativeSmtpRecommendation(error.host || '');
    } else {
      errorDetails.recommendation = "Check your SMTP credentials and ensure your SMTP server allows the connection.";
    }
  }
  
  // Log the full error object for debugging
  console.error(`ERROR IN ${stage}:`, JSON.stringify(errorDetails, null, 2));
  console.error("ORIGINAL ERROR OBJECT:", error);
  
  return errorDetails;
};

export const isOutlookAuthError = (error: any): boolean => {
  const errorMsg = error?.message || '';
  const errorResponse = error?.response || '';
  
  return (
    errorMsg.includes('SmtpClientAuthentication is disabled for the Tenant') ||
    errorResponse.includes('SmtpClientAuthentication is disabled') ||
    errorMsg.includes('535 5.7.139 Authentication unsuccessful') ||
    errorResponse.includes('535 5.7.139 Authentication unsuccessful')
  );
};

export const getAlternativeSmtpRecommendation = (host: string): string => {
  if (host.includes('outlook') || host.includes('hotmail') || host.includes('office365')) {
    return "It appears you're using Microsoft Outlook/Office 365 which may have SMTP authentication disabled. Please check https://aka.ms/smtp_auth_disabled for more information, or consider using an alternative email provider like Gmail (smtp.gmail.com).";
  }
  return "Consider using an alternative SMTP server or checking your authentication credentials.";
};
