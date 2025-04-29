
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = new URLSearchParams(location.search).get('from') || '/';
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, {
        replace: true
      });
    }
  }, [isAuthenticated, navigate, from]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: 'יש להזין אימייל וסיסמה'
      });
      setIsLoading(false);
      return;
    }
    try {
      const {
        error
      } = await login(email, password);
      if (error) {
        console.error('Login error details:', error);
        let errorMessage = 'אנא בדוק את פרטי ההתחברות ונסה שוב';
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'שם משתמש או סיסמה שגויים';
        }
        toast({
          variant: 'destructive',
          title: 'שגיאה בהתחברות',
          description: errorMessage
        });
      } else {
        toast({
          title: 'התחברת בהצלחה'
        });
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: 'אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Use the current origin for redirect
      const redirectTo = `${window.location.origin}/google-auth-redirect`;
      
      console.log("Redirecting to:", redirectTo);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        }
      });
      
      if (error) {
        console.error('Google login error:', error);
        toast({
          variant: 'destructive',
          title: 'שגיאה בהתחברות עם Google',
          description: error.message
        });
      }
    } catch (err) {
      console.error('Unexpected Google login error:', err);
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: 'אירעה שגיאה לא צפויה בהתחברות עם Google'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-sky-300 to-teal-400">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg transform transition-all duration-500 hover:shadow-xl">
        <div className="text-center">
          <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="mx-auto h-16 w-auto loginLogo" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">מערכת ליינאפים</h2>
          <p className="mt-2 text-sm text-gray-600">יש להתחבר עם דואר אלקטרוני וסיסמה</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-right">
                דואר אלקטרוני:
              </label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 text-left" placeholder="your@email.com" disabled={isLoading} dir="ltr" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-right">
                סיסמה:
              </label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1" placeholder="••••••••" disabled={isLoading} dir="ltr" />
            </div>
          </div>
          
          <Button type="submit" disabled={isLoading} className="w-full py-2 px-4 border border-transparent text-sm rounded-md text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-bold">
            {isLoading ? 'מתחבר...' : 'התחבר'}
          </Button>
          
          <div className="mt-4 flex items-center justify-center">
            <div className="border-t border-gray-300 flex-grow mr-3"></div>
            <span className="text-xs text-gray-500 px-2">או</span>
            <div className="border-t border-gray-300 flex-grow ml-3"></div>
          </div>
          
          <Button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
              <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
              <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
              <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
            </svg>
            התחבר עם Google
          </Button>
        </form>
      </div>
    </div>;
};

export default Login;
