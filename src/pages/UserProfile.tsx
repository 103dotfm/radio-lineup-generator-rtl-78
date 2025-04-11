import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, Lock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';

const UserProfile = () => {
  const { user, updateUserProfile, updateUserEmail, updateUserPassword, connectWithGoogle, disconnectGoogle, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false);
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  
  useEffect(() => {
    const checkGoogleIdentity = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const identities = data.user.identities || [];
          const googleIdentity = identities.find(identity => identity.provider === 'google');
          setHasGoogleLinked(!!googleIdentity);
        }
      } catch (error) {
        console.error('Error checking Google identity:', error);
      }
    };
    
    if (user) {
      checkGoogleIdentity();
    }
  }, [user]);
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    
    try {
      const { error } = await updateUserProfile({ full_name: fullName });
      
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון הפרופיל",
          description: error.message || "אירעה שגיאה בעדכון הפרופיל",
        });
      } else {
        toast({
          title: "הפרופיל עודכן בהצלחה",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון הפרופיל",
        description: "אירעה שגיאה לא צפויה",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    
    try {
      if (!newEmail) {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון האימייל",
          description: "יש להזין כתובת אימייל חדשה",
        });
        return;
      }
      
      const { error } = await updateUserEmail(newEmail);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון האימייל",
          description: error.message || "אירעה שגיאה בעדכון האימייל",
        });
      } else {
        setNewEmail('');
        toast({
          title: "הוראות לעדכון האימייל נשלחו",
          description: "בדוק את תיבת הדואר הנכנס שלך להשלמת התהליך",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון האימייל",
        description: "אירעה שגיאה לא צפויה",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    
    try {
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "הסיסמאות אינן תואמות",
          description: "אנא ודא כי הסיסמה החדשה והאימות שלה זהים",
        });
        setIsUpdatingPassword(false);
        return;
      }
      
      if (password.length < 6) {
        toast({
          variant: "destructive",
          title: "הסיסמה קצרה מדי",
          description: "אנא בחר סיסמה באורך 6 תווים לפחות",
        });
        setIsUpdatingPassword(false);
        return;
      }
      
      const { error } = await updateUserPassword(password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בעדכון הסיסמה",
          description: error.message || "אירעה שגיאה בעדכון הסיסמה",
        });
      } else {
        setPassword('');
        setConfirmPassword('');
        toast({
          title: "הסיסמה עודכנה בהצלחה",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון הסיסמה",
        description: "אירעה שגיאה לא צפויה",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  const handleGoogleConnect = async () => {
    setIsConnectingGoogle(true);
    try {
      const { error } = await connectWithGoogle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בחיבור חשבון",
          description: error.message || "אירעה שגיאה בחיבור חשבון Google",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בחיבור חשבון",
        description: "אירעה שגיאה לא צפויה",
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };
  
  const handleGoogleDisconnect = async () => {
    setIsDisconnectingGoogle(true);
    try {
      const { error } = await disconnectGoogle();
      
      if (error) {
        toast({
          variant: "destructive",
          title: "שגיאה בניתוק החשבון",
          description: error.message || "אירעה שגיאה בניתוק החשבון מ-Google",
        });
      } else {
        setHasGoogleLinked(false);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה בניתוק החשבון",
        description: "אירעה שגיאה לא צפויה",
      });
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertTitle>לא מחובר</AlertTitle>
          <AlertDescription>עליך להתחבר כדי לצפות בעמוד זה</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/login')} className="mt-4">
          התחבר
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="ml-2">
          <ArrowLeft className="h-4 w-4 ml-1" />
          חזרה
        </Button>
        <h1 className="text-2xl font-bold">הגדרות חשבון</h1>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 ml-2" />
            פרופיל
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="h-4 w-4 ml-2" />
            אימייל
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center">
            <Lock className="h-4 w-4 ml-2" />
            סיסמה
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>פרטי פרופיל</CardTitle>
              <CardDescription>עדכן את פרטי הפרופיל שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} id="profile-form">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">שם משתמש</Label>
                    <Input 
                      id="username" 
                      value={user.username || user.email} 
                      disabled 
                      className="bg-gray-50" 
                    />
                    <p className="text-xs text-gray-500">שם המשתמש אינו ניתן לשינוי</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">שם מלא</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="הכנס את שמך המלא" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="currentEmail">כתובת אימייל נוכחית</Label>
                    <Input 
                      id="currentEmail" 
                      value={user.email} 
                      disabled 
                      className="bg-gray-50" 
                    />
                    <p className="text-xs text-gray-500">לעדכון כתובת האימייל, עבור ללשונית "אימייל"</p>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit" form="profile-form" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'מעדכן...' : 'שמור שינויים'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>חשבונות מחוברים</CardTitle>
              <CardDescription>נהל את חשבונות החברתיים המחוברים</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 ml-3" viewBox="0 0 24 24">
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
                    <div>
                      <h3 className="text-sm font-medium">Google</h3>
                      <p className="text-xs text-gray-500">
                        {hasGoogleLinked 
                          ? 'חשבון Google מחובר לחשבונך'
                          : 'חבר את חשבון Google שלך לחשבונך'}
                      </p>
                    </div>
                  </div>
                  {hasGoogleLinked ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGoogleDisconnect}
                      disabled={isDisconnectingGoogle}
                      className="flex items-center"
                    >
                      {isDisconnectingGoogle ? 'מנתק...' : 'נתק חשבון'}
                      <ExternalLink className="h-3 w-3 mr-1" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGoogleConnect}
                      disabled={isConnectingGoogle}
                      className="flex items-center"
                    >
                      {isConnectingGoogle ? 'מחבר...' : 'חבר חשבון'}
                      <ExternalLink className="h-3 w-3 mr-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              className="w-full"
            >
              התנתק
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>עדכון כתובת אימייל</CardTitle>
              <CardDescription>שנה את כתובת האימייל המשויכת לחשבונך</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEmail} id="email-form">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentEmail">כתובת אימייל נוכחית</Label>
                    <Input 
                      id="currentEmail" 
                      value={user.email} 
                      disabled 
                      className="bg-gray-50" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">כתובת אימייל חדשה</Label>
                    <Input 
                      id="newEmail" 
                      type="email"
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      placeholder="הזן כתובת אימייל חדשה" 
                      dir="ltr"
                    />
                  </div>
                </div>
              </form>
              
              <Alert className="mt-4">
                <AlertTitle>שים לב</AlertTitle>
                <AlertDescription>
                  לאחר שינוי כתובת האימייל, תישלח הודעת אימות לכתובת החדשה. 
                  יש ללחוץ על הקישור בהודעה כדי להשלים את תהליך השינוי.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button type="submit" form="email-form" disabled={isUpdatingEmail}>
                {isUpdatingEmail ? 'מעדכן...' : 'עדכן אימייל'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>שינוי סיסמה</CardTitle>
              <CardDescription>עדכן את סיסמת החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} id="password-form">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">סיסמה חדשה</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="הזן סיסמה חדשה" 
                    />
                    <p className="text-xs text-gray-500">לפחות 6 תווים</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="הזן שוב את הסיסמה החדשה" 
                    />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button type="submit" form="password-form" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? 'מעדכן...' : 'שנה סיסמה'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;
