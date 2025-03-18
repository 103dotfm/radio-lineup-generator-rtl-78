
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const GoogleAuthRedirect = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Processing authentication...');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the code from the URL parameters
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setMessage('No authorization code found in the URL.');
          return;
        }

        setMessage(`Authorization code received. Exchanging for tokens...`);
        
        // Get the Gmail settings from the database
        const { data: emailSettings, error: settingsError } = await supabase
          .from('email_settings')
          .select('*')
          .limit(1)
          .single();
          
        if (settingsError) {
          throw new Error(`Failed to fetch email settings: ${settingsError.message}`);
        }
        
        if (!emailSettings) {
          throw new Error('Email settings not found in the database.');
        }
        
        if (!emailSettings.gmail_client_id || !emailSettings.gmail_client_secret) {
          throw new Error('Gmail client ID or client secret not configured.');
        }
        
        // Set the redirect URI to the current page
        const redirectUri = `${window.location.origin}/gmail-auth-redirect`;
        
        // Call the edge function to exchange the code for tokens
        const { data, error } = await supabase.functions.invoke('gmail-auth', {
          body: { 
            code,
            redirectUri,
            clientId: emailSettings.gmail_client_id,
            clientSecret: emailSettings.gmail_client_secret
          }
        });
        
        if (error) {
          console.error('Error calling Gmail auth function:', error);
          throw new Error(`Error calling Gmail auth function: ${error.message}`);
        }
        
        if (data.error) {
          console.error('Error from Gmail auth function:', data.error, data.message);
          throw new Error(`Error from Gmail auth function: ${data.error} ${data.message || ''}`);
        }
        
        if (!data.refreshToken) {
          throw new Error('No refresh token received from Google. You may need to revoke access and try again.');
        }
        
        // Save the tokens to the database
        const { error: updateError } = await supabase
          .from('email_settings')
          .update({
            gmail_refresh_token: data.refreshToken,
            gmail_access_token: data.accessToken,
            gmail_token_expiry: data.expiryDate,
            gmail_redirect_uri: redirectUri // Save the successful redirect URI
          })
          .eq('id', emailSettings.id);
          
        if (updateError) {
          console.error('Failed to save tokens:', updateError);
          throw new Error(`Failed to save tokens: ${updateError.message}`);
        }
        
        toast({
          title: "Gmail authentication successful",
          description: "Your Gmail account has been successfully connected.",
          variant: "default",
        });
        
        setStatus('success');
        setMessage('Google authentication successful! You can now use Gmail API to send emails.');
      } catch (error: any) {
        console.error('Google auth error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
        setErrorDetails(error);
        
        toast({
          title: "Authentication failed",
          description: error.message || "An unknown error occurred",
          variant: "destructive",
        });
      }
    };

    handleAuth();
  }, [location, toast]);

  const goToEmailSettings = () => {
    navigate('/admin?tab=email');
  };

  return (
    <div className="container mx-auto py-12 px-4" dir="rtl">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">אימות Google</CardTitle>
          <CardDescription className="text-center">
            {status === 'processing' ? 'מעבד את הנתונים מ-Google...' :
             status === 'success' ? 'החיבור הושלם בהצלחה!' :
             'אירעה שגיאה בתהליך האימות'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          {status === 'processing' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
              <p className="text-center">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <p className="text-center">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4 w-full">
              <AlertCircle className="h-16 w-16 text-red-600" />
              <Alert variant="destructive">
                <AlertTitle>שגיאה בתהליך האימות</AlertTitle>
                <AlertDescription className="text-right">
                  {message}
                  {errorDetails && (
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 text-left direction-ltr">
                      {JSON.stringify(errorDetails, null, 2)}
                    </pre>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={goToEmailSettings}>
            חזור להגדרות דואר אלקטרוני
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GoogleAuthRedirect;
