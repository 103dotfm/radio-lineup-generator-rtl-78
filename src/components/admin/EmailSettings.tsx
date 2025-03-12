import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Trash, Plus, Send, AlertCircle, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BasicEditor from "../editor/BasicEditor";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useLocation, useSearchParams } from 'react-router-dom';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface EmailSettingsType {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  subject_template: string;
  body_template: string;
  email_method: 'smtp' | 'gmail_api';
  gmail_client_id: string;
  gmail_client_secret: string;
  gmail_refresh_token: string;
  gmail_redirect_uri: string;
  gmail_access_token?: string;
  gmail_token_expiry?: string;
}

const EmailSettings: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [authorizingGmail, setAuthorizingGmail] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [settings, setSettings] = useState<EmailSettingsType>({
    id: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    sender_email: '',
    sender_name: '',
    subject_template: '',
    body_template: '',
    email_method: 'smtp',
    gmail_client_id: '',
    gmail_client_secret: '',
    gmail_refresh_token: '',
    gmail_redirect_uri: '',
    gmail_access_token: '',
    gmail_token_expiry: ''
  });
  const [recipients, setRecipients] = useState<Array<{id: string, email: string}>>([]);
  const [newEmail, setNewEmail] = useState('');
  const [latestShow, setLatestShow] = useState<any>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('yaniv@103.fm');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  
  useEffect(() => {
    loadSettings();
    loadRecipients();
    loadLatestShow();
    
    // Check for OAuth code in URL
    const code = searchParams.get('code');
    
    if (code) {
      console.log('Found OAuth code in URL:', code);
      handleGmailAuthCode(code);
    }
  }, [searchParams]);

  const handleGmailAuthCode = async (code: string) => {
    console.log('Processing Gmail auth code');
    
    // Update UI to show we're processing the code
    toast({
      title: "קוד אימות Gmail התקבל",
      description: "מעבד את הקוד...",
      variant: "default"
    });
    
    try {
      setAuthorizingGmail(true);
      
      // Exchange the code for tokens
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { 
          code,
          redirectUri: settings.gmail_redirect_uri,
          clientId: settings.gmail_client_id,
          clientSecret: settings.gmail_client_secret
        }
      });
      
      if (error) throw error;
      
      if (data && data.refreshToken) {
        console.log('Got refresh token from Google');
        
        // Save the refresh token to our database
        const newSettings = {
          ...settings,
          gmail_refresh_token: data.refreshToken,
          gmail_access_token: data.accessToken,
          gmail_token_expiry: data.expiryDate
        };
        
        await saveGmailTokens(newSettings);
        
        toast({
          title: "אימות Gmail הושלם בהצלחה",
          description: "התחברות לחשבון Gmail בוצעה בהצלחה",
          variant: "default"
        });
      } else {
        throw new Error('לא התקבל טוקן מגוגל');
      }
      
      // Remove code from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (error) {
      console.error('Error processing Gmail auth code:', error);
      toast({
        title: "שגיאה בתהליך אימות Gmail",
        description: error.message || 'אירעה שגיאה לא ידועה',
        variant: "destructive"
      });
    } finally {
      setAuthorizingGmail(false);
    }
  };

  const handleManualTokenSubmission = async () => {
    if (!manualTokenInput.trim()) {
      toast({
        title: "טוקן ריק",
        description: "אנא הכנס טוקן תקף",
        variant: "destructive"
      });
      return;
    }

    try {
      setAuthorizingGmail(true);
      
      // Process the manual refresh token
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { 
          refreshToken: manualTokenInput,
          clientId: settings.gmail_client_id,
          clientSecret: settings.gmail_client_secret
        }
      });
      
      if (error) throw error;
      
      if (data && data.accessToken) {
        console.log('Successfully validated manual refresh token');
        
        // Save the tokens to our database
        const newSettings = {
          ...settings,
          gmail_refresh_token: manualTokenInput,
          gmail_access_token: data.accessToken,
          gmail_token_expiry: data.expiryDate
        };
        
        await saveGmailTokens(newSettings);
        
        setManualTokenInput('');
        
        toast({
          title: "טוקן Gmail נשמר בהצלחה",
          description: "טוקן הגישה נוצר בהצלחה",
          variant: "default"
        });
      } else {
        throw new Error('לא ניתן לאמת את הטוקן שהוזן');
      }
    } catch (error) {
      console.error('Error processing manual token:', error);
      toast({
        title: "שגיאה בעיבוד הטוקן",
        description: error.message || 'אירעה שגיאה בעיבוד הטוקן',
        variant: "destructive"
      });
    } finally {
      setAuthorizingGmail(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "הועתק ללוח",
          variant: "default"
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: "שגיאה בהעתקה ללוח",
          variant: "destructive"
        });
      }
    );
  };

  const saveGmailTokens = async (updatedSettings: EmailSettingsType) => {
    try {
      const { error } = await supabase
        .from('email_settings')
        .update({
          gmail_refresh_token: updatedSettings.gmail_refresh_token,
          gmail_access_token: updatedSettings.gmail_access_token,
          gmail_token_expiry: updatedSettings.gmail_token_expiry,
          id: updatedSettings.id,
          body_template: updatedSettings.body_template,
          smtp_host: updatedSettings.smtp_host,
          smtp_port: updatedSettings.smtp_port,
          smtp_user: updatedSettings.smtp_user,
          smtp_password: updatedSettings.smtp_password,
          sender_email: updatedSettings.sender_email,
          sender_name: updatedSettings.sender_name,
          subject_template: updatedSettings.subject_template,
          email_method: updatedSettings.email_method,
          gmail_client_id: updatedSettings.gmail_client_id,
          gmail_client_secret: updatedSettings.gmail_client_secret,
          gmail_redirect_uri: updatedSettings.gmail_redirect_uri
        });

      if (error) throw error;
      
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving Gmail tokens:', error);
      throw error;
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        setSettings(data as EmailSettingsType);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      toast({
        title: "שגיאה בטעינת הגדרות דואר אלקטרוני",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('email_recipients')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setRecipients(data);
      }
    } catch (error) {
      console.error('Error loading email recipients:', error);
      toast({
        title: "שגיאה בטעינת רשימת הנמענים",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadLatestShow = async () => {
    try {
      const { data, error } = await supabase
        .from('shows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        setLatestShow(data);
      }
    } catch (error) {
      console.error('Error loading latest show:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('email_settings')
        .upsert({
          id: settings.id,
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_user: settings.smtp_user,
          smtp_password: settings.smtp_password,
          sender_email: settings.sender_email,
          sender_name: settings.sender_name,
          subject_template: settings.subject_template,
          body_template: settings.body_template,
          email_method: settings.email_method,
          gmail_client_id: settings.gmail_client_id,
          gmail_client_secret: settings.gmail_client_secret,
          gmail_refresh_token: settings.gmail_refresh_token,
          gmail_redirect_uri: settings.gmail_redirect_uri,
          gmail_access_token: settings.gmail_access_token,
          gmail_token_expiry: settings.gmail_token_expiry
        });

      if (error) throw error;
      
      toast({
        title: "הגדרות דואר אלקטרוני נשמרו בהצלחה",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "שגיאה בשמירת הגדרות דואר אלקטרוני",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = async () => {
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
      toast({
        title: "כתובת דואר אלקטרוני לא תקינה",
        description: "אנא הכנס כתובת דואר אלקטרוני תקינה",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('email_recipients')
        .insert({ email: newEmail })
        .select();

      if (error) throw error;
      
      setRecipients([...recipients, data[0]]);
      setNewEmail('');
      
      toast({
        title: "נמען נוסף בהצלחה",
        variant: "default"
      });
    } catch (error) {
      console.error('Error adding email recipient:', error);
      toast({
        title: "שגיאה בהוספת נמען",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const removeRecipient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_recipients')
        .delete()
        .match({ id });

      if (error) throw error;
      
      setRecipients(recipients.filter(r => r.id !== id));
      
      toast({
        title: "נמען הוסר בהצלחה",
        variant: "default"
      });
    } catch (error) {
      console.error('Error removing email recipient:', error);
      toast({
        title: "שגיאה בהסרת נמען",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendTestEmail = async () => {
    if (!latestShow) {
      toast({
        title: "לא נמצאה תוכנית לשליחה",
        description: "אנא צור תוכנית חדשה",
        variant: "destructive"
      });
      return;
    }

    try {
      setSendingTest(true);
      setErrorDetails(null);
      setRawResponse('');
      
      console.log(`Sending test email for show: ${latestShow.id} to: ${testEmailAddress}`);
      
      const { data, error } = await supabase.functions.invoke('send-lineup-email', {
        body: { 
          showId: latestShow.id,
          testEmail: testEmailAddress  
        }
      });
      
      console.log('Test email response:', data);
      
      if (error) {
        console.error('Edge function error:', error);
        setErrorDetails({ 
          stage: 'EDGE_FUNCTION_CALL', 
          message: error.message || 'Unknown error calling edge function',
          details: error 
        });
        throw new Error(`Error calling edge function: ${error.message}`);
      }
      
      const responseText = JSON.stringify(data, null, 2);
      setRawResponse(responseText);
      
      toast({
        title: "דואר אלקטרוני לדוגמה נשלח בהצלחה",
        description: `נשלח לכתובת ${testEmailAddress}`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error sending test email:', error);
      toast({
        title: "שגיאה בשליחת דואר אלקטרוני לדוגמה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isOutlookAuthError = (details: any) => {
    return details?.message?.includes('SmtpClientAuthentication is disabled for the Tenant') ||
           details?.response?.includes('SmtpClientAuthentication is disabled');
  };

  const initiateGmailAuth = () => {
    if (!settings.gmail_client_id || !settings.gmail_redirect_uri) {
      toast({
        title: "נדרשת הגדרה של Client ID ו-Redirect URI",
        description: "יש להגדיר את שדות Client ID ו-Redirect URI לפני חיבור ל-Gmail",
        variant: "destructive"
      });
      return;
    }
    
    // Save the current settings before initiating the OAuth flow
    saveSettings().then(() => {
      const scope = 'https://www.googleapis.com/auth/gmail.send';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.gmail_client_id}&redirect_uri=${encodeURIComponent(settings.gmail_redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      
      // Open the authorization URL in a new window
      const authWindow = window.open(authUrl, 'gmailAuthWindow', 'width=600,height=600');
      
      // Check if window was blocked
      if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
        toast({
          title: "חלון האימות נחסם",
          description: "אנא אפשר חלונות קופצים באתר זה ונסה שוב",
          variant: "destructive"
        });
      }
    });
  };

  const refreshGmailToken = async () => {
    if (!settings.gmail_refresh_token) {
      toast({
        title: "אין טוקן רענון",
        description: "יש לבצע אימות ראשוני מול Gmail לפני רענון טוקן",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAuthorizingGmail(true);
      
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { 
          refreshToken: settings.gmail_refresh_token,
          clientId: settings.gmail_client_id,
          clientSecret: settings.gmail_client_secret
        }
      });
      
      if (error) throw error;
      
      if (data && data.accessToken) {
        const newSettings = {
          ...settings,
          gmail_access_token: data.accessToken,
          gmail_token_expiry: data.expiryDate
        };
        
        await saveGmailTokens(newSettings);
        
        toast({
          title: "טוקן Gmail רוענן בהצלחה",
          variant: "default"
        });
      } else {
        throw new Error('לא התקבל טוקן גישה חדש');
      }
    } catch (error) {
      console.error('Error refreshing Gmail token:', error);
      toast({
        title: "שגיאה ברענון טוקן Gmail",
        description: error.message || 'אירעה שגיאה לא ידועה',
        variant: "destructive"
      });
    } finally {
      setAuthorizingGmail(false);
    }
  };

  const processTemplate = (template: string) => {
    if (!latestShow) return template;
    
    let processed = template;
    const formattedDate = latestShow.date ? new Date(latestShow.date).toLocaleDateString('he-IL') : "";
    
    processed = processed.replace(/{{show_name}}/g, latestShow.name || '');
    processed = processed.replace(/{{show_date}}/g, formattedDate);
    processed = processed.replace(/{{show_time}}/g, latestShow.time || '');
    
    return processed;
  };

  const getGmailAuthStatus = () => {
    if (!settings.gmail_refresh_token) {
      return {
        status: 'not_authenticated',
        message: 'לא מחובר למערכת Gmail',
        color: 'text-red-500'
      };
    }
    
    if (settings.gmail_token_expiry) {
      const expiryDate = new Date(settings.gmail_token_expiry);
      const now = new Date();
      
      if (expiryDate > now) {
        return {
          status: 'authenticated',
          message: `מחובר למערכת Gmail (תוקף עד ${expiryDate.toLocaleString('he-IL')})`,
          color: 'text-green-500'
        };
      } else {
        return {
          status: 'expired',
          message: 'טוקן Gmail פג תוקף, יש לרענן',
          color: 'text-amber-500'
        };
      }
    }
    
    return {
      status: 'unknown',
      message: 'סטטוס חיבור Gmail לא ידוע',
      color: 'text-gray-500'
    };
  };

  const generateAuthUrlForCopyPaste = () => {
    if (!settings.gmail_client_id || !settings.gmail_redirect_uri) {
      return '';
    }
    
    const scope = 'https://www.googleapis.com/auth/gmail.send';
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.gmail_client_id}&redirect_uri=${encodeURIComponent(settings.gmail_redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">טוען...</div>;
  }

  const gmailStatus = getGmailAuthStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">הגדרות דואר אלקטרוני</h2>
      </div>
      
      <Tabs defaultValue="recipients" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="recipients">נמענים</TabsTrigger>
          <TabsTrigger value="settings">הגדרות שליחה</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="template">תבנית הודעה</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>רשימת נמענים</CardTitle>
              <CardDescription>
                כתובות דואר אלקטרוני אלו יקבלו באופן אוטומטי את ליינאפ התוכנית דקה לאחר תחילתה
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center space-x-4 space-between">
                  <Input
                    dir="ltr"
                    className="flex-grow ml-4"
                    placeholder="כתובת דואר אלקטרוני חדשה"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button 
                    onClick={addRecipient} 
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    הוסף נמען
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  {recipients.length === 0 ? (
                    <p className="text-center text-muted-foreground">אין נמענים ברשימה</p>
                  ) : (
                    recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between">
                        <span dir="ltr">{recipient.email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(recipient.id)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 w-full">
              <div className="flex w-full gap-4 items-center">
                <Input
                  dir="ltr"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="כתובת למשלוח דואר אלקטרוני לדוגמה"
                  className="flex-grow"
                />
                <Button 
                  onClick={sendTestEmail} 
                  variant="outline" 
                  className="flex items-center gap-2 whitespace-nowrap"
                  disabled={sendingTest}
                >
                  <Send className="h-4 w-4" />
                  {sendingTest ? "שולח..." : "שלח דואר אלקטרוני לדוגמה"}
                </Button>
              </div>
              
              {errorDetails && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>שגיאה בשליחת דואר אלקטרוני</AlertTitle>
                  <AlertDescription>
                    <div className="text-sm mt-2">
                      <p><strong>שלב:</strong> {errorDetails.stage || 'לא ידוע'}</p>
                      <p><strong>הודעה:</strong> {errorDetails.message || 'לא ידוע'}</p>
                      {errorDetails.code && <p><strong>קוד שגיאה:</strong> {errorDetails.code}</p>}
                      {errorDetails.responseCode && <p><strong>קוד תגובה:</strong> {errorDetails.responseCode}</p>}
                      {errorDetails.response && <p><strong>תגובה:</strong> {errorDetails.response}</p>}
                      {errorDetails.command && <p><strong>פקודה:</strong> {errorDetails.command}</p>}
                      
                      {isOutlookAuthError(errorDetails) && (
                        <Alert variant="warning" className="mt-4 bg-amber-50">
                          <AlertTitle className="text-amber-800">אימות SMTP של Outlook מושבת</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            <p className="mb-2">חשבון ה-Outlook שלך אינו מאפשר אימות SMTP. יש לבצע אחת מהפעולות הבאות:</p>
                            <ol className="list-decimal list-inside space-y-1 mb-2">
                              <li>הפעל אימות SMTP בחשבון Outlook שלך</li>
                              <li>השתמש בשירות דואר אחר כמו Gmail</li>
                              <li>השתמש בחשבון Outlook אחר שבו מופעלת האפשרות</li>
                            </ol>
                            <a 
                              href="https://aka.ms/smtp_auth_disabled" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:underline"
                            >
                              למידע נוסף <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {rawResponse && !errorDetails && (
                <Alert className="mt-4">
                  <AlertTitle>תגובה מהשרת (גולמית)</AlertTitle>
                  <AlertDescription>
                    <div className="text-xs mt-2 overflow-auto max-h-40 p-2 bg-gray-100 rounded">
                      <pre dir="ltr">{rawResponse}</pre>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות שליחת דואר אלקטרוני</CardTitle>
              <CardDescription>
                בחר את שיטת שליחת הדואר האלקטרוני המועדפת עליך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <RadioGroup 
                  value={settings.email_method} 
                  onValueChange={(value) => setSettings({...settings, email_method: value as 'smtp' | 'gmail_api'})}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="smtp" id="email-method-smtp" />
                    <Label htmlFor="email-method-smtp" className="mr-2 cursor-pointer">שרת SMTP (שיטה סטנדרטית)</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="gmail_api" id="email-method-gmail" />
                    <Label htmlFor="email-method-gmail" className="mr-2 cursor-pointer">ממשק API של Gmail</Label>
                  </div>
                </RadioGroup>
                
                <Alert>
                  <AlertTitle>מידע על שיטות שליחה</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2"><strong>שרת SMTP:</strong> שיטה סטנדרטית לשליחת דואר אלקטרוני. מתאימה לרוב השירותים אך עלולה להיתקל בחסימות.</p>
                    <p><strong>ממשק API של Gmail:</strong> שיטה מתקדמת לשליחת דואר דרך חשבון Google. מתאימה במיוחד אם נתקלת בבעיות עם SMTP של Gmail או Outlook.</p>
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender_email">כתובת דואר אלקטרוני השולח</Label>
                    <Input
                      id="sender_email"
                      dir="ltr"
                      value={settings.sender_email}
                      onChange={(e) => setSettings({...settings, sender_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender_name">שם השולח</Label>
                    <Input
                      id="sender_name"
                      value={settings.sender_name}
                      onChange={(e) => setSettings({...settings, sender_name: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={saveSettings} 
                disabled={saving}
              >
                {saving ? "שומר..." : "שמור הגדרות"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="smtp">
          {settings.email_method === 'smtp' ? (
            <Card>
              <CardHeader>
                <CardTitle>הגדרות שרת SMTP</CardTitle>
                <CardDescription>
                  הגדרות אלו ישמשו לשליחת דואר אלקטרוני של ליינאפ התוכנית
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>הערה חשובה לגבי חשבונות Outlook/Microsoft 365</AlertTitle>
                    <AlertDescription>
                      <p>אם אתה משתמש בחשבון Outlook או Microsoft 365, ייתכן שאימות SMTP אינו מופעל בחשבון שלך. במקרה זה, יש לפעול לפי אחת מהאפשרויות הבאות:</p>
                      <ol className="list-decimal list-inside mt-2">
                        <li>הפעל אימות SMTP בחשבון Outlook שלך</li>
                        <li>השתמש בשרת SMTP אחר (כמו Gmail)</li>
                        <li>צור חשבון Outlook חדש עם אימות SMTP מופעל</li>
                      </ol>
                      <a 
                        href="https://aka.ms/smtp_auth_disabled" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:underline mt-2"
                      >
                        למידע נוסף <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">שרת SMTP</Label>
                      <Input
                        id="smtp_host"
                        dir="ltr"
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({...settings, smtp_host: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">פורט</Label>
                      <Input
                        id="smtp_port"
                        dir="ltr"
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({...settings, smtp_port: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_user">שם משתמש</Label>
                      <Input
                        id="smtp_user"
                        dir="ltr"
                        value={settings.smtp_user}
                        onChange={(e) => setSettings({...settings, smtp_user: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_password">סיסמה</Label>
                      <Input
                        id="smtp_password"
                        dir="ltr"
                        type="password"
                        value={settings.smtp_password}
                        onChange={(e) => setSettings({...settings, smtp_password: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={saveSettings} 
                  disabled={saving}
                >
                  {saving ? "שומר..." : "שמור הגדרות"}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>הגדרות ממשק Gmail API</CardTitle>
                <CardDescription>
                  הגדרות אלו ישמשו לשליחת דואר אלקטרוני באמצעות ממשק ה-API של Gmail
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert className="mb-4">
                    <AlertTitle>הגדרת ממשק API של Gmail</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">כדי להשתמש בממשק API של Gmail, עליך ליצור פרוייקט ב-Google Cloud Platform ולהגדיר את הפרטים הבאים:</p>
                      <ol className="list-decimal list-inside space-y-1 mb-2">
                        <li>צור פרוייקט ב-<a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                        <li>הפעל את ממשק Gmail API</li>
                        <li>צור אישורי OAuth 2.0 לאפליקציית Web</li>
                        <li>הוסף את כתובת האתר שלך כ-Authorized redirect URI</li>
                        <li>העתק את Client ID ו-Client Secret לשדות למטה</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gmail_client_id">Client ID</Label>
                      <Input
                        id="gmail_client_id"
                        dir="ltr"
                        value={settings.gmail_client_id}
                        onChange={(e) => setSettings({...settings, gmail_client_id: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gmail_client_secret">Client Secret</Label>
                      <Input
                        id="gmail_client_secret"
                        dir="ltr"
                        type="password"
                        value={settings.gmail_client_secret}
                        onChange={(e) => setSettings({...settings, gmail_client_secret: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmail_redirect_uri">כתובת הפניה מאושרת (Redirect URI)</Label>
                    <Input
                      id="gmail_redirect_uri"
                      dir="ltr"
                      value={settings.gmail_redirect_uri}
                      onChange={(e) => setSettings({...settings, gmail_redirect_uri: e.target.value})}
                      placeholder="https://your-app-url.com/admin"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      הכתובת אליה יופנה המשתמש לאחר אישור הגישה. חייבת להיות זהה להגדרות בקונסולת Google
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>סטטוס אימות Gmail</Label>
                    <div className={`text-sm ${gmailStatus.color} p-2 border rounded-md flex justify-between items-center`}>
                      <span>{gmailStatus.message}</span>
                      {gmailStatus.status === 'authenticated' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex items-center gap-1"
                          onClick={refreshGmailToken}
                          disabled={authorizingGmail}
                        >
                          <RefreshCw className="h-3 w-3" />
                          רענן טוקן
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-md">שיטה 1: אימות אוטומטי (מומלץ)</h3>
                    <div className="flex justify-between">
                      <Button 
                        onClick={saveSettings} 
                        disabled={saving}
                      >
                        {saving ? "שומר..." : "שמור הגדרות"}
                      </Button>
                      
                      <Button 
                        onClick={initiateGmailAuth} 
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={!settings.gmail_client_id || !settings.gmail_client_secret || !settings.gmail_redirect_uri || authorizingGmail}
                      >
                        {authorizingGmail ? "מבצע אימות..." : "בצע אימות מול Gmail"}
                      </Button>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <h3 className="font-medium text-md">שיטה 2: אימות ידני (במקרה של חסימת חלונות קופצים)</h3>
                    
                    <div className="space-y-2">
                      <Label>1. העתק את כתובת האימות ופתח אותה בדפדפן:</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          dir="ltr"
                          readOnly 
                          value={generateAuthUrlForCopyPaste()}
                          onClick={() => copyToClipboard(generateAuthUrlForCopyPaste())}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(generateAuthUrlForCopyPaste())}
                          disabled={!settings.gmail_client_id || !settings.gmail_redirect_uri}
                        >
                          {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="refresh_token_manual">2. לאחר אישור הגישה, הכנס את הטוקן שקיבלת:</Label>
                      <div className="flex gap-2">
                        <Input
                          id="refresh_token_manual"
                          dir="ltr"
                          value={manualTokenInput}
                          onChange={(e) => setManualTokenInput(e.target.value)}
                          placeholder="הכנס כאן את הטוקן שקיבלת..."
                        />
                        <Button 
                          onClick={handleManualTokenSubmission}
                          disabled={!manualTokenInput.trim() || authorizingGmail}
                        >
                          {authorizingGmail ? "מאמת..." : "אמת טוקן"}
                        </Button>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>הערה חשובה</AlertTitle>
                      <AlertDescription>
                        לאחר שתאשר את הגישה, תקבל קוד בחלק מהדפדפנים (כרום) ובחלק תועבר ישירות לכתובת שהגדרת.
                        במידה ותועבר ישירות, המערכת תזהה זאת אוטומטית. אם קיבלת קוד, העתק אותו לשדה למעלה ולחץ על "אמת טוקן".
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="template">
          <Card>
            <CardHeader>
              <CardTitle>תבנית הודעה</CardTitle>
              <CardDescription>
                עיצוב והגדרות למבנה הודעת הדואר אלקטרוני. ניתן להשתמש בתגים הבאים: <br />
                <code>{`{{show_name}}`}</code> - שם התוכנית, <code>{`{{show_date}}`}</code> - תאריך התוכנית, <code>{`{{show_time}}`}</code> - שעת התוכנית, <code>{`{{interviewees_list}}`}</code> - רשימת המרואיינים, <code>{`{{lineup_link}}`}</code> - קישור לליינאפ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject_template">נושא ההודעה</Label>
                  <Input
                    id="subject_template"
                    value={settings.subject_template}
                    onChange={(e) => setSettings({...settings, subject_template: e.target.value})}
                  />
                  {latestShow && (
                    <div className="text-sm text-muted-foreground mt-1">
                      תצוגה מקדימה: {processTemplate(settings.subject_template)}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_template">תוכן ההודעה</Label>
                  <div className="mt-2">
                    <BasicEditor
                      content={settings.body_template}
                      onChange={(html) => setSettings({...settings, body_template: html})}
                      placeholder="תוכן הודעת הדואר אלקטרוני..."
                      showTextAlign={true}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                onClick={saveSettings} 
                disabled={saving}
              >
                {saving ? "שומר..." : "שמור תבנית"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailSettings;
