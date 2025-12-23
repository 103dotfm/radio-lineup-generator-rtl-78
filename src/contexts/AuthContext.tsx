import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  role: string;
  is_admin: boolean;
  full_name?: string;
  title?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshToken: async () => {},
  isAuthenticated: false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('AuthContext: checking session, calling /auth/verify');
        const storedUser = localStorage.getItem('user');
        
        // Try to verify session
        const { data: verifyResp, error: verifyError } = await api.query('/auth/verify');
        
        if (verifyError) {
          // Handle verification error
          if (verifyError.status === 401 || verifyError.status === 403) {
            // Authentication error, clear session
            setUser(null);
            localStorage.removeItem('user');
          } else {
            // Network or other error, try to use stored user if available
            if (storedUser) {
              console.log('Using stored user due to verification error');
              setUser(JSON.parse(storedUser));
            }
          }
          setError(verifyError as Error);
        } else {
          const sessionValid = verifyResp && verifyResp.valid;
          
          if (sessionValid) {
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            } else {
              // Fetch user info from backend
              const { data: userData, error: userError } = await api.query('/auth/me');
              if (userError) {
                console.error('Error fetching user data:', userError);
                setError(userError as Error);
              } else if (userData) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              }
            }
          } else {
            // Session is invalid, clear everything
            setUser(null);
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        
        // Don't immediately clear the session on network errors
        // Only clear if it's an authentication error
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status === 401 || status === 403) {
            setUser(null);
            localStorage.removeItem('user');
          }
        }
        
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return;

    // Refresh token every hour to keep session active
    const refreshInterval = setInterval(async () => {
      try {
        await api.mutate('/auth/refresh', {});
        console.log('Token refreshed automatically');
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Don't log out user on refresh failure, let them continue
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Add visibility change listener to refresh token when user returns to tab
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          // Check if session is still valid when user returns to tab
          const { data: verifyResp, error: verifyError } = await api.query('/auth/verify');
          if (verifyError || !verifyResp?.valid) {
            console.log('Session expired, logging out user');
            setUser(null);
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Error checking session on visibility change:', error);
          // Don't log out user on network errors, let them continue
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Add activity tracking to extend session
  useEffect(() => {
    if (!user) return;

    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimeout = () => {
      clearTimeout(activityTimeout);
      // Set timeout for 30 minutes of inactivity
      activityTimeout = setTimeout(async () => {
        try {
          // Refresh token on user activity
          await api.mutate('/auth/refresh', {});
          console.log('Token refreshed due to user activity');
        } catch (error) {
          console.error('Failed to refresh token on activity:', error);
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivityTimeout, true);
    });

    // Initial timeout
    resetActivityTimeout();

    return () => {
      clearTimeout(activityTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetActivityTimeout, true);
      });
    };
  }, [user]);

  // Listen for user data updates from profile changes
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('AuthContext: Received user data update event', event.detail);
      setUser(event.detail);
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Make a real authentication request
      const { data: userData, error: authError } = await api.mutate('/auth/login', {
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message || 'Authentication failed');
      }

      if (!userData) {
        throw new Error('No user data received');
      }

      // In development, store the token in localStorage
      if (process.env.NODE_ENV !== 'production' && userData.token) {
        localStorage.setItem('auth_token', userData.token);
        // Remove token from userData before storing
        const { token, ...userDataWithoutToken } = userData;
        setUser(userDataWithoutToken);
        localStorage.setItem('user', JSON.stringify(userDataWithoutToken));
      } else {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the logout endpoint to clear server-side session
      await api.mutate('/auth/logout', {});
      
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const { error: refreshError } = await api.mutate('/auth/refresh', {});
      if (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw refreshError;
      }
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signOut,
      refreshToken,
      isAuthenticated: !!user,
      isAdmin: user?.is_admin || false
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
