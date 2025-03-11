
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
  getSession: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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
        setUser(data);
        setIsAdmin(data.is_admin);
        lastUserCheckRef.current = now;
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  // Handle session persistence and restoration
  const initializeSession = async () => {
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Found existing session', session.user.id);
        setIsAuthenticated(true);
        await checkUserRole(session.user.id, true);
      } else {
        console.log('No session found');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const getSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize session on component mount
    initializeSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.id);
        setIsAuthenticated(true);
        await checkUserRole(session.user.id, true);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        lastUserCheckRef.current = 0;
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed for user:', session.user.id);
        // No need to re-authenticate, just ensure user data is current
        await checkUserRole(session.user.id, false);
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout, getSession }}>
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
