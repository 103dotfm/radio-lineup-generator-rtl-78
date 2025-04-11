
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getAppDomain } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<{ error: any }>;
  updateUserEmail: (email: string) => Promise<{ error: any }>;
  updateUserPassword: (password: string) => Promise<{ error: any }>;
  connectWithGoogle: () => Promise<{ error: any }>;
  disconnectGoogle: () => Promise<{ error: any }>;
}

// Create the context with a default value that matches the shape
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  login: async () => ({ error: null }),
  loginWithGoogle: async () => {},
  logout: async () => {},
  updateUserProfile: async () => ({ error: null }),
  updateUserEmail: async () => ({ error: null }),
  updateUserPassword: async () => ({ error: null }),
  connectWithGoogle: async () => ({ error: null }),
  disconnectGoogle: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const lastUserCheckRef = useRef<number>(0);
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const { toast } = useToast();

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        checkUserRole(session.user.id, true);
      }
    });

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

  const loginWithGoogle = async () => {
    try {
      const domain = await getAppDomain();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${domain}/google-auth-redirect`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google login error:', error);
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: error.message || "אירעה שגיאה בהתחברות באמצעות Google",
        });
      } else if (data) {
        console.log('Google OAuth initiated successfully', data);
      }
    } catch (error) {
      console.error('Unexpected Google login error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בהתחברות",
        description: "אירעה שגיאה לא צפויה בהתחברות באמצעות Google",
      });
    }
  };

  // New function for connecting existing account with Google
  const connectWithGoogle = async () => {
    try {
      const domain = await getAppDomain();
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${domain}/google-auth-redirect?action=link`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('Error connecting with Google:', error);
        toast({
          variant: "destructive",
          title: "שגיאה בחיבור חשבון Google",
          description: error.message || "אירעה שגיאה בחיבור חשבון Google",
        });
        return { error };
      }
      
      console.log('Google connection initiated successfully', data);
      return { error: null };
    } catch (error) {
      console.error('Unexpected error connecting with Google:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בחיבור חשבון",
        description: "אירעה שגיאה לא צפויה בחיבור חשבון Google",
      });
      return { error };
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }
      
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);
        
      if (error) {
        return { error };
      }
      
      setUser(prev => prev ? { ...prev, ...data } : null);
      
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  };
  
  const updateUserEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email });
      
      if (error) {
        return { error };
      }
      
      toast({
        title: "אימות אימייל נשלח",
        description: "בדוק את תיבת הדואר הנכנס שלך להשלמת עדכון האימייל",
      });
      
      return { error: null };
    } catch (error) {
      console.error('Error updating email:', error);
      return { error };
    }
  };
  
  const updateUserPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error };
    }
  };
  
  const disconnectGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.unlinkIdentity({
        provider: 'google'
      });
      
      if (error) {
        console.error('Error disconnecting Google account:', error);
        toast({
          variant: "destructive",
          title: "שגיאה בניתוק חשבון Google",
          description: error.message || "אירעה שגיאה בניתוק חשבון Google",
        });
        return { error };
      }
      
      toast({
        title: "חשבון Google נותק בהצלחה",
        description: "חשבון Google נותק מחשבונך בהצלחה",
      });
      
      return { error: null };
    } catch (error) {
      console.error('Unexpected error disconnecting Google:', error);
      toast({
        variant: "destructive",
        title: "שגיאה בניתוק חשבון",
        description: "אירעה שגיאה לא צפויה בניתוק חשבון Google",
      });
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

  const contextValue: AuthContextType = {
    isAuthenticated, 
    isAdmin, 
    user, 
    login, 
    loginWithGoogle,
    logout,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    connectWithGoogle,
    disconnectGoogle
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
