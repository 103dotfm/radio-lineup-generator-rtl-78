import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Trash, Plus, Send, AlertCircle, ExternalLink, RefreshCw, Copy, Check, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BasicEditor from "../editor/BasicEditor";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [authorizingGmail, setAuthorizingGmail] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [manualCodeInput, setManualCodeInput] = useState('');
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
      setManualCodeInput(code);
      handleGmailAuthCode(code);
      
      // Remove code from URL without reload
      navigate('/admin', { replace: true });
    }
  }, [searchParams]);

  const handleGmailAuthCode = async (code: string) => {
    console.log('Processing Gmail auth code:', code);
    
    // Update UI to show we're processing the code
    toast({
      title: "קוד אימות Gmail התקבל",
      description: "מעבד את הקוד...",
      variant: "default"
    });
    
    try {
      setAuthorizingGmail(true);
      setErrorDetails(null);
      
      if (!settings.gmail_redirect_uri || !settings.gmail_client_id || !settings.gmail_client_secret) {
        throw new Error("חסרות הגדרות חשובות (URI הפניה, מזהה לקוח או סוד לקוח)");
      }
      
      // Exchange the code for tokens
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { 
          code,
          redirectUri: settings.gmail_redirect_uri,
          clientId: settings.gmail_client_id,
          clientSecret: settings.gmail_client_secret
        }
      });
      
      if (error) {
        console.error('Error from gmail-auth function:', error);
        throw error;
      }
      
      console.log('Response from gmail-auth function:', data);
      
      if (data && data.error) {
        throw new Error(data.error + (data.message ? ': ' + data.message : ''));
      }
      
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
        throw new Error('לא התקבל טוקן רענון מגוגל');
      }
    } catch (error) {
      console.error('Error processing Gmail auth code:', error);
      setErrorDetails({
        stage: 'GMAIL_AUTH_CODE',
        message: error.message || 'אירעה שגיאה לא ידועה',
        details: error
      });
      
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
      setErrorDetails(null);
      
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
      setErrorDetails({
        stage: 'MANUAL_TOKEN_VALIDATION',
        message: error.message || 'אירעה שגיאה בעיבוד הטוקן',
        details: error
      });
      
      toast({
        title: "שגיאה בעיבוד הטוקן",
        description: error.message || 'אירעה שגיאה בעיבוד הטוקן',
        variant: "destructive"
      });
    } finally {
      setAuthorizingGmail(false);
    }
  };

  const handleManualCodeSubmission = async () => {
    if (!manualCodeInput.trim()) {
      toast({
        title: "קוד אימות ריק",
        description: "אנא הכנס קוד אימות תקף",
        variant: "destructive"
      });
      return;
    }

    try {
      await handleGmailAuthCode(manualCodeInput);
    } catch (error) {
      console.error('Error processing manual code:', error);
      toast({
        title: "שגיאה בעיבוד קוד האימות",
        description: error.message || 'אירעה שגיאה בעיבוד קוד האימות',
        variant: "destructive"
      });
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
          gmail_token_expiry: updatedSettings.gmail_token_expiry
        })
        .eq('id', updatedSettings.id);

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
      // Make sure the redirectUri in settings is configured to point to the admin page
      const scope = 'https://www.googleapis.com/auth/gmail.send';
      
      // Make sure to include access_type=offline and prompt=consent to always get a refresh token
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.gmail_client_id}&redirect_uri=${encodeURIComponent(settings.gmail_redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      
      toast({
        title: "פתיחת חלון אימות Gmail",
        description: "עוקב אחר ההוראות בחלון שנפתח",
        variant: "default"
      });
      
      // Open the authorization URL in a new window
      window.location.href = authUrl;
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
      setErrorDetails(null);
      
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
      setErrorDetails({
        stage: 'TOKEN_REFRESH',
        message: error.message || 'אירעה שגיאה לא ידועה',
        details: error
      });
      
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
                      <p>אם אתה משתמש בחשבון Outlook או Microsoft 365, ייתכן שאימות SMTP אינו מופעל בחשבון שלך. במקרה
