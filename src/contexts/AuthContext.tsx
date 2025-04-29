
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  title?: string;
  avatar_url?: string;
  is_admin: boolean;
  google_id?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create the context with a default value that matches the shape
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  login: async () => ({ error: null }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const lastUserCheckRef = useRef<number>(0);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const [isInitialized, setIsInitialized] = useState(false);

  const checkUserRole = async (userId: string, force: boolean = false) => {
    const now = Date.now();
    if (!force && lastUserCheckRef.current && (now - lastUserCheckRef.current < CACHE_DURATION)) {
      console.log('Using cached user data');
      return;
    }

    try {
      console.log('Checking user role for user ID:', userId);
      
      // Initialize a variable to hold user data that we can reassign
      let finalUserData = null;

      // First get the basic user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        
        // If user doesn't exist in the users table, try to create the record
        if (userError.code === 'PGRST116') {
          console.log('User not found in users table, creating record...');
          
          // Get user details from auth.users
          const { data: authData } = await supabase.auth.getUser();
          
          if (authData && authData.user) {
            // Check if this is a Google auth user
            const googleIdentity = authData.user.identities?.find(
              identity => identity.provider === 'google'
            );
            
            // Insert the user into the users table
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: authData.user.email,
                username: authData.user.user_metadata.name || authData.user.email,
                full_name: authData.user.user_metadata.full_name || authData.user.email,
                is_admin: false, // Default to non-admin for new users
                google_id: googleIdentity?.id // Store Google ID if available
              });
              
            if (insertError) {
              console.error('Error creating user record:', insertError);
              toast({
                title: 'שגיאה ביצירת משתמש',
                description: 'לא ניתן היה ליצור רשומה עבור המשתמש',
                variant: 'destructive'
              });
              return;
            }
            
            // Retry fetching the user data
            const { data: newUserData, error: newUserError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
              
            if (newUserError) {
              console.error('Error fetching new user data:', newUserError);
              return;
            }
            
            // Assign to our reassignable variable
            finalUserData = newUserData;
          }
        } else {
          toast({
            title: 'שגיאה בטעינת נתוני משתמש',
            description: userError.message,
            variant: 'destructive'
          });
          return;
        }
      } else {
        // If no error, use the userData directly
        finalUserData = userData;
      }
      
      // Then get profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile data:', profileError);
      }

      if (finalUserData) {
        // Combine user data with profile data
        const combinedUserData = {
          ...finalUserData,
          ...(profileData || {}),
        };
        
        setUser(combinedUserData);
        setIsAdmin(finalUserData.is_admin);
        lastUserCheckRef.current = now;
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      toast({
        title: 'שגיאה בטעינת נתוני משתמש',
        description: 'אירעה שגיאה בטעינת פרטי המשתמש',
        variant: 'destructive'
      });
    }
  };

  const refreshProfile = async () => {
    console.log('Refreshing user profile');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session in refreshProfile:', error);
        return;
      }
      
      if (data.session?.user) {
        await checkUserRole(data.session.user.id, true);
      }
    } catch (error) {
      console.error('Error in refreshProfile:', error);
    }
  };

  useEffect(() => {
    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
          setIsInitialized(true);
          return;
        }
        
        if (data.session) {
          setIsAuthenticated(true);
          await checkUserRole(data.session.user.id, true);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        setIsInitialized(true);
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      try {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true);
          await checkUserRole(session.user.id, true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUser(null);
          lastUserCheckRef.current = 0;
        } else if (event === 'USER_UPDATED' && session) {
          // Refresh user data when user is updated
          await checkUserRole(session.user.id, true);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { error };
      }

      if (data.user) {
        await checkUserRole(data.user.id, true);
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected login error:', error);
      return { error };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      lastUserCheckRef.current = 0;
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'שגיאה בתהליך ההתנתקות',
        description: 'אירעה שגיאה בתהליך ההתנתקות',
        variant: 'destructive'
      });
    }
  };

  // Provide the actual values to the context
  const contextValue: AuthContextType = {
    isAuthenticated, 
    isAdmin, 
    user, 
    login, 
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
