
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  isAuthenticated: boolean;
  isAdmin: boolean; // Add isAdmin property
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<{error?: any}>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false, // Add default value for isAdmin
  user: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error checking session:', error);
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(data?.session?.user ?? null);
          
          // Check if user is admin
          if (data?.session?.user) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('is_admin')
              .eq('id', data.session.user.id)
              .single();
              
            if (!userError && userData) {
              setIsAdmin(userData.is_admin || false);
            } else {
              setIsAdmin(false);
            }
          } else {
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('Exception checking session:', error);
        setUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // Check admin status when auth state changes
      if (session?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
          
        if (!userError && userData) {
          setIsAdmin(userData.is_admin || false);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }
      
      // Check if user is admin after login
      if (data?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();
          
        if (!userError && userData) {
          setIsAdmin(userData.is_admin || false);
        }
      }
      
      navigate('/');
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setIsAdmin(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isAuthenticated: !!user,
    isAdmin,
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
