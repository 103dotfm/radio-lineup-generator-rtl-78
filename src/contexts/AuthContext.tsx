
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Create the hook before the provider to ensure consistent exports
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const lastUserCheckRef = useRef<number>(0);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const [isLoading, setIsLoading] = useState(true);

  const checkUserRole = async (userId: string, force: boolean = false) => {
    const now = Date.now();
    if (!force && lastUserCheckRef.current && (now - lastUserCheckRef.current < CACHE_DURATION)) {
      console.log('Using cached user data');
      return;
    }

    try {
      console.log('Fetching user role for userId:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      if (data) {
        console.log('User data retrieved:', data);
        setUser(data);
        setIsAdmin(data.is_admin || false);
        lastUserCheckRef.current = now;
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  useEffect(() => {
    // Initial session check
    const initializeAuth = async () => {
      console.log('Initializing auth state');
      setIsLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session found, user is authenticated');
          setIsAuthenticated(true);
          await checkUserRole(session.user.id, true);
        } else {
          console.log('No session found, user is not authenticated');
          setIsAuthenticated(false);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in, setting isAuthenticated to true');
        setIsAuthenticated(true);
        await checkUserRole(session.user.id, true);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing auth state');
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
      console.log('Attempting login for email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { error };
      }

      console.log('Login successful, user ID:', data.user?.id);
      if (data.user) {
        setIsAuthenticated(true); // Explicitly set isAuthenticated to true here
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
      console.log('Logging out user');
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      lastUserCheckRef.current = 0;
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const contextValue = {
    isAuthenticated,
    isAdmin,
    user,
    isLoading,
    login,
    logout
  };
  
  console.log('Auth context current state:', { isAuthenticated, isAdmin, user: user?.username, isLoading });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
