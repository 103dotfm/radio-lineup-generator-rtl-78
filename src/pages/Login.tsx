import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth();
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
      await signIn(email, password);
      toast({
        title: 'התחברת בהצלחה'
      });
    } catch (err) {
      console.error('Unexpected login error:', err);
      toast({
        variant: 'destructive',
        title: 'שגיאה בהתחברות',
        description: 'אנא בדוק את פרטי ההתחברות ונסה שוב'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center modern-gradient p-4" dir="rtl">
      <div className="w-full max-w-md animate-in">
        <div className="glass-card rounded-3xl p-8 md:p-12 premium-shadow">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <img src="/storage/uploads/general/103fm-logo.png" alt="103FM" className="h-10 w-auto invert brightness-0" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-800 mb-2">ברוכים הבאים</h2>
            <p className="text-slate-400 font-medium">מערכת ליינאפים // 103FM</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-slate-700 mr-1 uppercase tracking-wider">
                  דואר אלקטרוני
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all"
                  placeholder="name@example.com"
                  disabled={isLoading}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-bold text-slate-700 mr-1 uppercase tracking-wider">
                  סיסמה
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  disabled={isLoading}
                  dir="ltr"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isLoading ? 'מתחבר בהצלחה...' : 'כניסה למערכת'}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © 2025 103FM. גירסה 2.0 (Staging Area)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
