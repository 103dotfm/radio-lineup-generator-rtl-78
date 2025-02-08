
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "שגיאה בהתחברות",
        description: "יש להזין אימייל וסיסמה"
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await login(email, password);
      
      if (error) {
        console.error("Login error details:", error);
        let errorMessage = "אנא בדוק את פרטי ההתחברות ונסה שוב";
        
        // Handle specific error cases
        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "שם משתמש או סיסמה שגויים";
        }
        
        toast({
          variant: "destructive",
          title: "שגיאה בהתחברות",
          description: errorMessage
        });
      } else {
        toast({
          title: "התחברת בהצלחה"
        });
        navigate("/");
      }
    } catch (err) {
      console.error("Unexpected login error:", err);
      toast({
        variant: "destructive",
        title: "שגיאה בהתחברות",
        description: "אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <img 
            src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" 
            alt="103FM" 
            className="mx-auto h-16 w-auto loginLogo"
          />
          <h2 className="mt-6 text-2xl font-bold">מערכת ליינאפים</h2>
          <p className="mt-2 text-sm text-gray-600">
            יש להתחבר עם דואר אלקטרוני וסיסמה
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-right">
                אימייל
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 text-left"
                placeholder="your@email.com"
                disabled={isLoading}
                dir="ltr"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-right">
                סיסמה
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="••••••••"
                disabled={isLoading}
                dir="ltr"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "מתחבר..." : "התחבר"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
