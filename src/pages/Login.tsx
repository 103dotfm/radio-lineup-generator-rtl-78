
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
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
      await loginWithGoogle();
      // No need for toast here as we're redirecting to Google
    } catch (error) {
      console.error('Error initiating Google login:', error);
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: 'אירעה שגיאה בניסיון התחברות עם Google'
      });
    }
  };
  
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-sky-300 to-teal-400">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg transform transition-all duration-500 hover:shadow-xl">
        <div className="text-center">
          <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="mx-auto h-16 w-auto loginLogo" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">מערכת ליינאפים</h2>
          <p className="mt-2 text-sm text-gray-600">יש להתחבר עם דואר אלקטרוני וסיסמה</p>
        </div>
        
        <Button 
          onClick={handleGoogleLogin} 
          className="w-full mt-6 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          variant="outline"
          disabled={isLoading}
        >
          <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          התחבר עם Google
        </Button>
        
        <div className="mt-6 flex items-center justify-between">
          <Separator className="w-[30%]" />
          <span className="text-sm text-gray-500">או</span>
          <Separator className="w-[30%]" />
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
        </form>
      </div>
    </div>;
};

export default Login;
