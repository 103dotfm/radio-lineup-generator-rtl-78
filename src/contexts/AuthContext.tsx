
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
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Add cache timestamp ref
  const lastUserCheckRef = useRef<number>(0);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  const checkUserRole = async (userId: string, force: boolean = false) => {
    const now = Date.now();
    
    // Skip if we checked recently and it's not forced
    if (!force && lastUserCheckRef.current && (now - lastUserCheckRef.current < CACHE_DURATION)) {
      console.log('Using cached user data');
      return;
    }

    console.log('AuthProvider: Checking user role for', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return;
      }

      console.log('AuthProvider: User data fetched', data);
      if (data) {
        setUser(data);
        setIsAdmin(data.is_admin);
        lastUserCheckRef.current = now;
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Initializing');
    
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session check', session);
      if (session) {
        setIsAuthenticated(true);
        checkUserRole(session.user.id, true); // Force initial check
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        checkUserRole(session.user.id, true); // Force check on sign in
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        lastUserCheckRef.current = 0; // Reset cache on sign out
      }
    });

    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only check if we have a current session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            checkUserRole(session.user.id); // Will use cache if recent
          }
        });
      }
    };

    // Add with a longer debounce
    let visibilityTimeout: NodeJS.Timeout;
    document.addEventListener('visibilitychange', () => {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(handleVisibilityChange, 1000);
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('AuthProvider: Attempting login for', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return { error };
      }

      console.log('AuthProvider: Login successful', data.user?.id);
      if (data.user) {
        await checkUserRole(data.user.id, true); // Force check on manual login
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected login error:', error);
      return { error };
    }
  };

  const logout = async () => {
    console.log('AuthProvider: Logging out');
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      lastUserCheckRef.current = 0; // Reset cache on logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout }}>
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
