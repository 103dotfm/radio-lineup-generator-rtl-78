
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Trash, Plus, Send, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BasicEditor from "../editor/BasicEditor";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const EmailSettings: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settings, setSettings] = useState({
    id: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    sender_email: '',
    sender_name: '',
    subject_template: '',
    body_template: '',
    email_method: 'smtp', // 'smtp' or 'gmail'
    gmail_client_id: '',
    gmail_client_secret: '',
    gmail_refresh_token: '',
    gmail_redirect_uri: '',
    gmail_authorized: false
  });
  const [recipients, setRecipients] = useState<Array<{id: string, email: string}>>([]);
  const [newEmail, setNewEmail] = useState('');
  const [latestShow, setLatestShow] = useState<any>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('yaniv@103.fm');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [oauthCode, setOauthCode] = useState<string>('');
  
  useEffect(() => {
    loadSettings();
    loadRecipients();
    loadLatestShow();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data) {
        // Set default email_method to 'smtp' if not present
        const updatedData = {
          ...data,
          email_method: data.email_method || 'smtp',
          gmail_client_id: data.gmail_client_id || '',
          gmail_client_secret: data.gmail_client_secret || '',
          gmail_refresh_token: data.gmail_refresh_token || '',
          gmail_redirect_uri: data.gmail_redirect_uri || window.location.origin + '/admin',
          gmail_authorized: !!data.gmail_refresh_token
        };
        
        setSettings(updatedData);
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
          gmail_redirect_uri: settings.gmail_redirect_uri
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
          testEmail: testEmailAddress,
          emailMethod: settings.email_method 
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
      console.error('Error sending test email:', error, errorDetails);
      toast({
        title: "שגיאה בשליחת דואר אלקטרוני לדוגמה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
    }
  };

  const generateGmailAuthUrl = async () => {
    try {
      if (!settings.gmail_client_id || !settings.gmail_redirect_uri) {
        toast({
          title: "נדרש מזהה לקוח ו-URI להפניה מחדש",
          description: "אנא הזן את כל פרטי הקישור של Gmail API",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-gmail-auth-url', {
        body: { 
          clientId: settings.gmail_client_id,
          redirectUri: settings.gmail_redirect_uri
        }
      });
      
      if (error) throw error;
      
      setAuthUrl(data.authUrl);
      
      toast({
        title: "קישור אימות נוצר בהצלחה",
        description: "עקוב אחר הקישור לאישור הגישה",
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating Gmail auth URL:', error);
      toast({
        title: "שגיאה ביצירת קישור אימות",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exchangeCodeForToken = async () => {
    try {
      if (!oauthCode) {
        toast({
          title: "נדרש קוד אימות",
          description: "אנא הזן את קוד האימות שקיבלת מ-Google",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('exchange-oauth-code', {
        body: { 
          code: oauthCode,
          clientId: settings.gmail_client_id,
          clientSecret: settings.gmail_client_secret,
          redirectUri: settings.gmail_redirect_uri
        }
      });
      
      if (error) throw error;
      
      if (data.refresh_token) {
        setSettings({
          ...settings,
          gmail_refresh_token: data.refresh_token,
          gmail_authorized: true
        });
        
        // Save the refresh token to the database
        await supabase
          .from('email_settings')
          .upsert({
            id: settings.id,
            gmail_refresh_token: data.refresh_token
          });
      
        toast({
          title: "אימות Gmail בוצע בהצלחה",
          description: "האפליקציה מחוברת כעת לחשבון ה-Gmail שלך",
          variant: "default"
        });

        setOauthCode('');
      } else {
        throw new Error("לא התקבל token רענון. נסה שוב את תהליך האימות.");
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      toast({
        title: "שגיאה בהחלפת קוד אימות",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק ללוח",
      variant: "default"
    });
  };

  // Helper function to check if the error is related to Outlook SMTP authentication
  const isOutlookAuthError = (details: any) => {
    return details?.message?.includes('SmtpClientAuthentication is disabled for the Tenant') ||
           details?.response?.includes('SmtpClientAuthentication is disabled');
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8" dir="rtl">טוען...</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">הגדרות דואר אלקטרוני</h2>
      </div>
      
      <Tabs defaultValue="recipients" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="recipients">נמענים</TabsTrigger>
          <TabsTrigger value="email-method">שיטת שליחה</TabsTrigger>
          <TabsTrigger value="smtp">הגדרות SMTP</TabsTrigger>
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
                              <li>הפעל אימות SMTP בחשבון Outlook שלך דרך הפורטל של Microsoft 365</li>
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

        <TabsContent value="email-method">
          <Card>
            <CardHeader>
              <CardTitle>שיטת שליחת דואר אלקטרוני</CardTitle>
              <CardDescription>
                בחר את השיטה המועדפת לשליחת דואר אלקטרוני
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={settings.email_method}
                onValueChange={(value) => setSettings({...settings, email_method: value})}
                className="space-y-4"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="smtp" id="smtp" />
                  <Label htmlFor="smtp" className="mr-2">שרת SMTP</Label>
                  <p className="text-sm text-muted-foreground mr-2">
                    שימוש בשרת SMTP רגיל לשליחת הודעות
                  </p>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="gmail" id="gmail" />
                  <Label htmlFor="gmail" className="mr-2">Gmail API</Label>
                  <p className="text-sm text-muted-foreground mr-2">
                    שימוש ב-Gmail API לשליחת הודעות (מומלץ לחשבונות Outlook/Microsoft שאינם מאפשרים SMTP)
                  </p>
                </div>
              </RadioGroup>

              {settings.email_method === 'gmail' && (
                <div className="mt-6 space-y-4 border p-4 rounded-md">
                  <h3 className="text-lg font-medium">הגדרות Gmail API</h3>
                  
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>הוראות להגדרת Gmail API</AlertTitle>
                    <AlertDescription>
                      <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li>צור פרויקט ב-<a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                        <li>הפעל את Gmail API</li>
                        <li>צור אישורי OAuth (מסוג Web Application)</li>
                        <li>הגדר את כתובת ההפניה המחדש (URI להפניה מחדש) לכתובת הבאה:</li>
                      </ol>
                      <div className="flex items-center gap-2 mt-2 p-2 bg-gray-100 rounded">
                        <code dir="ltr">{settings.gmail_redirect_uri || window.location.origin + '/admin'}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(settings.gmail_redirect_uri || window.location.origin + '/admin')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gmail_client_id">מזהה לקוח</Label>
                        <Input
                          id="gmail_client_id"
                          dir="ltr"
                          value={settings.gmail_client_id}
                          onChange={(e) => setSettings({...settings, gmail_client_id: e.target.value})}
                          placeholder="הזן את מזהה הלקוח מ-Google Cloud Console"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gmail_client_secret">סוד לקוח</Label>
                        <Input
                          id="gmail_client_secret"
                          dir="ltr"
                          type="password"
                          value={settings.gmail_client_secret}
                          onChange={(e) => setSettings({...settings, gmail_client_secret: e.target.value})}
                          placeholder="הזן את סוד הלקוח מ-Google Cloud Console"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="gmail_redirect_uri">URI להפניה מחדש</Label>
                      <Input
                        id="gmail_redirect_uri"
                        dir="ltr"
                        value={settings.gmail_redirect_uri}
                        onChange={(e) => setSettings({...settings, gmail_redirect_uri: e.target.value})}
                        placeholder="URL לפני מחדש לאחר אימות"
                      />
                      <p className="text-xs text-muted-foreground">
                        זו הכתובת שתופנה אליה לאחר אימות מול Google. חייבת להיות תואמת בדיוק לכתובת שהגדרת ב-Google Cloud Console.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>סטטוס אימות Gmail</Label>
                        <span className={`text-sm ${settings.gmail_authorized ? 'text-green-600' : 'text-red-600'}`}>
                          {settings.gmail_authorized ? 'מחובר' : 'לא מחובר'}
                        </span>
                      </div>
                      
                      {!settings.gmail_authorized ? (
                        <>
                          <Button 
                            onClick={generateGmailAuthUrl} 
                            className="w-full"
                            disabled={!settings.gmail_client_id || !settings.gmail_client_secret || !settings.gmail_redirect_uri}
                          >
                            צור קישור אימות
                          </Button>
                          
                          {authUrl && (
                            <div className="mt-4">
                              <Alert>
                                <AlertTitle>גש לקישור הבא לאימות:</AlertTitle>
                                <AlertDescription>
                                  <div className="mt-2">
                                    <a 
                                      href={authUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline break-all"
                                    >
                                      {authUrl}
                                    </a>
                                  </div>
                                </AlertDescription>
                              </Alert>
                              
                              <div className="mt-4 space-y-2">
                                <Label htmlFor="oauth_code">קוד אימות שהתקבל</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="oauth_code"
                                    dir="ltr"
                                    value={oauthCode}
                                    onChange={(e) => setOauthCode(e.target.value)}
                                    placeholder="הזן את קוד האימות שהתקבל מ-Google"
                                  />
                                  <Button onClick={exchangeCodeForToken}>אמת</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <Button 
                          onClick={() => setSettings({...settings, gmail_refresh_token: '', gmail_authorized: false})}
                          variant="outline"
                        >
                          נתק חשבון
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={saveSettings} 
                disabled={saving}
              >
                {saving ? "שומר..." : "שמור הגדרות שיטה"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="smtp">
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
                      <li>השתמש בשיטת Gmail API במקום</li>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body_template">תוכן ההודעה</Label>
                  <div className="mt-2">
                    <BasicEditor
                      content={settings.body_template}
                      onChange={(html) => setSettings({...settings, body_template: html})}
                      placeholder="תוכן הודעת הדואר אלקטרוני..."
                      rtl={true}
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
