
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Worker } from '@/lib/supabase/workers';
import { AlertCircle, UserPlus, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WorkerAccountTabProps {
  worker: Worker;
  onCreateAccount: (email: string) => Promise<void>;
  onResetPassword: () => Promise<void>;
}

const WorkerAccountTab: React.FC<WorkerAccountTabProps> = ({ 
  worker, 
  onCreateAccount,
  onResetPassword 
}) => {
  const [email, setEmail] = useState(worker.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Improved email validation with better error messages
  const validateEmail = (email: string): { isValid: boolean; message: string | null } => {
    if (!email.trim()) {
      return { isValid: false, message: "יש להזין כתובת אימייל" };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: "יש להזין כתובת אימייל תקינה" };
    }
    
    return { isValid: true, message: null };
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    // Enhanced validation
    const { isValid, message } = validateEmail(email);
    if (!isValid) {
      setErrorMessage(message);
      return;
    }
    
    // Set submitting state and log action
    setIsSubmitting(true);
    console.log("Attempting to create account for worker:", worker.id, "with email:", email);
    
    try {
      // Call the parent handler
      await onCreateAccount(email);
    } catch (error) {
      console.error("Error in handleCreateAccount:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResetPassword = async () => {
    setIsSubmitting(true);
    console.log("Attempting to reset password for worker:", worker.id);
    
    try {
      await onResetPassword();
    } catch (error) {
      console.error("Error in handleResetPassword:", error);
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 space-x-reverse">
            <h3 className="text-lg font-medium">מצב חשבון משתמש</h3>
            {worker.user_id ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                יש חשבון משתמש
              </Badge>
            ) : (
              <Badge variant="outline">אין חשבון משתמש</Badge>
            )}
          </div>
          
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>שגיאה</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {worker.user_id ? (
            <div className="space-y-4">
              <div>
                <p>המשתמש יכול להתחבר למערכת עם כתובת האימייל: <strong>{worker.email}</strong></p>
              </div>
              
              {worker.password_readable && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>סיסמה זמנית</AlertTitle>
                  <AlertDescription className="font-mono">
                    {worker.password_readable}
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Button 
                  onClick={handleResetPassword} 
                  className="flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      מאפס סיסמה...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      איפוס סיסמה
                    </>
                  )}
                </Button>
                <p className="text-sm text-gray-500 mt-2">איפוס סיסמה ייצור סיסמה חדשה ויבטל את הסיסמה הקודמת.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">כתובת אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="הזן כתובת אימייל עבור המשתמש"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    יוצר חשבון...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    יצירת חשבון משתמש
                  </>
                )}
              </Button>
              
              <p className="text-sm text-gray-500">יצירת חשבון תשלח לכתובת האימייל הזו סיסמה זמנית.</p>
            </form>
          )}
          
          {worker.user_id && !worker.password_readable && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>אזהרה</AlertTitle>
              <AlertDescription>
                אין גישה לסיסמה הנוכחית. יש ללחוץ על "איפוס סיסמה" כדי לייצר סיסמה חדשה.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerAccountTab;
