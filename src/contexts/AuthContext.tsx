import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  title?: string; // Add the missing title property
  avatar_url?: string;
  is_admin: boolean;
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

  const checkUserRole = async (userId: string, force: boolean = false) => {
    const now = Date.now();
    if (!force && lastUserCheckRef.current && (now - lastUserCheckRef.current < CACHE_DURATION)) {
      console.log('Using cached user data');
      return;
    }

    try {
      // First check if this user is a producer by looking up in workers table
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (workerError && workerError.code !== 'PGRST116') {
        console.error('Error checking worker data:', workerError);
      }
      
      // If the user is a producer (exists in workers table)
      const isProducerUser = !!workerData;
      
      // Get the basic user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to prevent errors when no record is found
      
      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user data:', userError);
      }
      
      // Then get profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile data:', profileError);
      }
      
      // Try to get user details from auth metadata as fallback
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!userData) {
        console.warn('No user data found for ID:', userId);
        
        if (authUser) {
          // Create basic user object from auth data, enhanced with worker data if available
          const basicUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            username: workerData?.name || authUser.email?.split('@')[0] || '',
            full_name: workerData?.name || authUser.user_metadata?.full_name || authUser.email,
            title: workerData?.position || profileData?.title || '',
            is_admin: false,
            avatar_url: profileData?.avatar_url || workerData?.photo_url || ''
          };
          
          setUser(basicUser);
          setIsAdmin(false);
          
          // Attempt to create user record if it doesn't exist
          if (!isProducerUser) { // Only for non-producer users
            try {
              await supabase.from('users').insert([{
                id: authUser.id,
                email: authUser.email,
                username: authUser.email?.split('@')[0] || '',
                full_name: authUser.user_metadata?.full_name || '',
                is_admin: false
              }]);
              console.log('Created missing user record');
            } catch (createError) {
              console.error('Failed to create missing user record:', createError);
            }
          }
        }
        return;
      }
      
      // We found user data in the users table
      // Create a User object with the correct type, explicitly including the title property
      const userWithTitle: User = {
        id: userData.id,
        email: userData.email || '',
        username: userData.username || '',
        full_name: userData.full_name || '',
        is_admin: userData.is_admin || false,
        // Add the title property safely, with fallbacks
        title: profileData?.title || workerData?.position || '',
        avatar_url: profileData?.avatar_url || workerData?.photo_url || ''
      };
      
      // Combine user data with profile data and worker data if available
      const combinedUserData = {
        ...userWithTitle,
        ...(profileData || {}),
        // If worker data exists, prioritize those fields
        full_name: workerData?.name || userWithTitle.full_name || '',
        title: workerData?.position || userWithTitle.title || '',
        avatar_url: profileData?.avatar_url || workerData?.photo_url || userWithTitle.avatar_url || ''
      };
      
      setUser(combinedUserData);
      setIsAdmin(userData.is_admin || false);
      lastUserCheckRef.current = now;
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי המשתמש",
        variant: "destructive"
      });
    }
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await checkUserRole(data.session.user.id, true);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        checkUserRole(session.user.id, true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        checkUserRole(session.user.id, true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        lastUserCheckRef.current = 0;
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
