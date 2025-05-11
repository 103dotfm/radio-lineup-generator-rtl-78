
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const useGoogleAuth = () => {
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
        
        // After a small delay, redirect to the dashboard
        setTimeout(() => {
          // Refresh user profile to ensure latest data
          if (refreshProfile) {
            refreshProfile().then(() => {
              navigate('/'); // Redirect to dashboard
            });
          } else {
            navigate('/'); // Redirect to dashboard
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
  
  return { status, errorDetails };
};
