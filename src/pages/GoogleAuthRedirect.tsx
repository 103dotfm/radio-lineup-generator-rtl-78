
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const GoogleAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Check if this is for linking an account
  const isLinking = location.search.includes('action=link');
  
  useEffect(() => {
    // Exchange the auth code for a session
    const handleAuthCode = async () => {
      try {
        // Get the session from the URL (handled automatically by Supabase)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        
        if (data.session) {
          console.log('Authentication successful, session created');
          setStatus('success');
          
          // Wait briefly to show success message
          setTimeout(() => {
            if (isLinking) {
              navigate('/profile');
            } else {
              navigate('/');
            }
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('No session was created. The authentication may have been cancelled.');
        }
      } catch (error) {
        console.error('Unexpected error in auth redirect:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication');
      }
    };
    
    handleAuthCode();
  }, [navigate, isLinking]);
  
  const getSuccessTitle = () => {
    return isLinking ? 'חשבון Google חובר בהצלחה' : 'התחברת בהצלחה';
  };
  
  const getSuccessDescription = () => {
    return isLinking 
      ? 'חשבון Google חובר בהצלחה לחשבונך'
      : 'התחברת בהצלחה באמצעות Google';
  };
  
  const getProcessingDescription = () => {
    return isLinking
      ? 'מעבד את בקשת חיבור חשבון Google...'
      : 'מעבד את פרטי ההתחברות מ-Google...';
  };
  
  const getSuccessAlertDescription = () => {
    return isLinking
      ? 'מיד תועבר לדף הפרופיל.'
      : 'מיד תועבר לדף הראשי.';
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{status === 'success' ? getSuccessTitle() : 'מתחבר...'}</CardTitle>
          <CardDescription>
            {status === 'processing' && getProcessingDescription()}
            {status === 'success' && getSuccessDescription()}
            {status === 'error' && 'אירעה שגיאה בתהליך'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'processing' && (
            <div className="flex justify-center my-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {status === 'success' && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <Check className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-800">הפעולה הושלמה בהצלחה!</AlertTitle>
              <AlertDescription className="text-green-700">
                {getSuccessAlertDescription()}
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle>שגיאה בתהליך</AlertTitle>
              <AlertDescription>
                {errorMessage || 'אירעה שגיאה לא צפויה בתהליך. נסה שוב.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => navigate(isLinking ? '/profile' : '/login')} 
            className="w-full"
            variant={status === 'error' ? 'default' : 'outline'}
          >
            {status === 'error' ? (isLinking ? 'חזור לדף הפרופיל' : 'חזור לדף ההתחברות') : 'בטל והתחבר באופן ידני'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GoogleAuthRedirect;
