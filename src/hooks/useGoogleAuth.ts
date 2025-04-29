
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useGoogleAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();
  
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

        // Check if the user exists in the auth system
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setStatus('error');
          setErrorDetails('No valid session found. Authentication failed.');
          return;
        }
        
        // Check if the user record exists in the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        // If the user doesn't exist in the users table, create a new record
        if (userError && userError.code === 'PGRST116') {
          console.log('Creating new user record for Google auth user');
          
          // Insert the user into the users table
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: sessionData.session.user.id,
              email: sessionData.session.user.email,
              full_name: sessionData.session.user.user_metadata.full_name || sessionData.session.user.email,
              is_admin: false // Default to non-admin for Google auth users
            });
            
          if (insertError) {
            console.error('Error creating user record:', insertError);
            toast({
              title: "שגיאה בעת יצירת רשומת משתמש",
              description: insertError.message,
              variant: "destructive"
            });
          }
        }
        
        // We'll handle the auth state ourselves and redirect appropriately
        setStatus('success');
        
        // After a small delay, refresh user profile to ensure latest data
        setTimeout(() => {
          if (refreshProfile) {
            refreshProfile().then(() => {
              navigate('/profile');
            }).catch(err => {
              console.error('Error refreshing profile:', err);
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
  }, [searchParams, navigate, refreshProfile, toast]);
  
  return { status, errorDetails };
};
