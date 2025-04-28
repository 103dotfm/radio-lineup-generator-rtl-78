
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';

const GoogleAuthRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        // Check if we're handling Google auth for user login
        const code = searchParams.get('code');
        
        if (!code) {
          setStatus('error');
          setErrorDetails('No authorization code found in the URL');
          return;
        }
        
        // We'll handle the auth state ourselves and redirect appropriately
        setStatus('success');
        
        // After a small delay, redirect to the profile page
        setTimeout(() => {
          // Refresh user profile to ensure latest data
          if (refreshProfile) {
            refreshProfile().then(() => {
              navigate('/profile');
            });
          } else {
            navigate('/profile');
          }
        }, 1000);
        
      } catch (error) {
        console.error('Unexpected error in auth redirect:', error);
        setStatus('error');
        setErrorDetails(`Unexpected error: ${error.message || 'Unknown error'}`);
      }
    };
    
    processAuth();
  }, [searchParams, navigate, refreshProfile]);
  
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
                Google Authentication was successful. You will be redirected shortly.
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>
                {errorDetails || 'An unknown error occurred during authentication.'}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col space-y-3 mt-6">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthRedirect;
