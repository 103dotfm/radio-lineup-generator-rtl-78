
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GoogleAuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  
  useEffect(() => {
    const processCode = async () => {
      try {
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setErrorDetails('No authorization code found in the URL');
          return;
        }
        
        console.log('Got authorization code, exchanging for tokens...');
        
        // Get the Gmail settings to use for the token exchange
        const { data: emailSettings, error: settingsError } = await supabase
          .from('email_settings')
          .select('gmail_client_id, gmail_client_secret, gmail_redirect_uri')
          .single();
          
        if (settingsError) {
          setStatus('error');
          setErrorDetails(`Failed to fetch email settings: ${settingsError.message}`);
          return;
        }
        
        if (!emailSettings.gmail_client_id || !emailSettings.gmail_client_secret || !emailSettings.gmail_redirect_uri) {
          setStatus('error');
          setErrorDetails('Gmail settings are incomplete. Please check your Gmail configuration in the admin panel.');
          return;
        }
        
        console.log('Exchanging code for tokens with Gmail API...');
        
        // Exchange the code for tokens
        const { data, error } = await supabase.functions.invoke('gmail-auth', {
          body: { 
            code,
            redirectUri: emailSettings.gmail_redirect_uri,
            clientId: emailSettings.gmail_client_id,
            clientSecret: emailSettings.gmail_client_secret
          }
        });
        
        if (error) {
          console.error('Error from Gmail auth function:', error);
          setStatus('error');
          setErrorDetails(`Error calling authentication function: ${error.message || 'Unknown error'}`);
          return;
        }
        
        if (data.error) {
          console.error('Error in Gmail auth response:', data);
          setStatus('error');
          setErrorDetails(`Authentication error: ${data.error}${data.message ? ': ' + data.message : ''}`);
          return;
        }
        
        if (!data.refreshToken) {
          setStatus('error');
          setErrorDetails('No refresh token received. You may need to revoke access and try again.');
          // Still save the access token if we got one
          if (data.accessToken) {
            setTokenInfo({
              accessToken: data.accessToken,
              expiryDate: data.expiryDate
            });
          }
          return;
        }
        
        console.log('Successfully received tokens from Gmail API');
        
        // Save the tokens to the database - corrected to use a plain update without the id
        const { error: updateError } = await supabase
          .from('email_settings')
          .update({
            gmail_refresh_token: data.refreshToken,
            gmail_access_token: data.accessToken,
            gmail_token_expiry: data.expiryDate
          })
          .eq('id', 1);  // Target the first and likely only record
          
        if (updateError) {
          setStatus('error');
          setErrorDetails(`Failed to save tokens: ${updateError.message}`);
          return;
        }
        
        setTokenInfo({
          refreshToken: data.refreshToken,
          accessToken: data.accessToken,
          expiryDate: data.expiryDate
        });
        
        setStatus('success');
      } catch (error) {
        console.error('Unexpected error in auth redirect:', error);
        setStatus('error');
        setErrorDetails(`Unexpected error: ${error.message || 'Unknown error'}`);
      }
    };
    
    processCode();
  }, [searchParams]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Google Authentication</h2>
            <p className="text-gray-500">
              {status === 'processing' && 'Processing your authentication...'}
              {status === 'success' && 'Authentication successful!'}
              {status === 'error' && 'Authentication failed'}
            </p>
          </div>
          
          {status === 'processing' && (
            <div className="flex justify-center my-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {status === 'success' && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Google Authentication was successful. Your Gmail account is now connected.
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                {errorDetails || 'An unknown error occurred during authentication.'}
                
                {tokenInfo && tokenInfo.accessToken && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <p className="text-sm font-medium">Note: We received an access token but no refresh token.</p>
                    <p className="text-xs mt-1">You may need to revoke access and try again with a new consent flow.</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col space-y-3 mt-6">
            {status === 'success' && (
              <div className="text-sm text-gray-500 mb-4">
                <p>Refresh token: {tokenInfo?.refreshToken ? '✓ Received' : '✗ Missing'}</p>
                <p>Access token: {tokenInfo?.accessToken ? '✓ Received' : '✗ Missing'}</p>
                <p>Expiry date: {tokenInfo?.expiryDate ? new Date(tokenInfo.expiryDate).toLocaleString() : 'N/A'}</p>
              </div>
            )}
            
            <Button 
              onClick={() => navigate('/admin?tab=smtp')} 
              className="w-full"
            >
              Return to Email Settings
            </Button>
            
            {status === 'error' && (
              <Button
                variant="outline"
                onClick={() => window.open('https://myaccount.google.com/permissions', '_blank')}
                className="w-full flex items-center justify-center gap-2"
              >
                Revoke Access in Google <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthRedirect;
