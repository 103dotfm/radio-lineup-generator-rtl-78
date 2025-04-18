
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Save, Upload, Play, Lock, ArrowUpDown, Server } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define the schema for FTP settings
const ftpSettingsSchema = z.object({
  server: z.string().min(1, { message: 'שרת FTP נדרש' }),
  port: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 65535, {
    message: 'פורט חייב להיות מספר תקין בין 1 ל-65535',
  }),
  username: z.string().min(1, { message: 'שם משתמש נדרש' }),
  password: z.string().min(1, { message: 'סיסמה נדרשת' }),
  remotePath: z.string().optional(),
  passive: z.boolean().default(true),
  autoUpload: z.boolean().default(false),
  interval: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'מרווח זמן חייב להיות מספר חיובי',
  }).default("60"),
});

type FTPSettings = z.infer<typeof ftpSettingsSchema>;

const FTPXMLSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  // Initialize the form
  const form = useForm<FTPSettings>({
    resolver: zodResolver(ftpSettingsSchema),
    defaultValues: {
      server: '',
      port: '21',
      username: '',
      password: '',
      remotePath: '/',
      passive: true,
      autoUpload: false,
      interval: '60',
    },
  });

  useEffect(() => {
    // Load saved FTP settings and XML preview
    const loadSettings = async () => {
      try {
        // Load FTP settings
        const { data: ftpData, error: ftpError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'ftp_settings')
          .maybeSingle();
          
        if (!ftpError && ftpData?.value) {
          try {
            const settings = JSON.parse(ftpData.value);
            form.reset({
              server: settings.server || '',
              port: settings.port || '21',
              username: settings.username || '',
              password: settings.password || '',
              remotePath: settings.remotePath || '/',
              passive: settings.passive ?? true,
              autoUpload: settings.autoUpload ?? false,
              interval: settings.interval || '60',
            });
            
            if (settings.lastUploaded) {
              setLastUploaded(settings.lastUploaded);
            }
          } catch (parseError) {
            console.error('Error parsing FTP settings:', parseError);
          }
        }
        
        // Load XML preview
        await loadXmlPreview();
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const loadXmlPreview = async () => {
    try {
      const { data: xmlData, error: xmlError } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
        
      if (!xmlError && xmlData?.value) {
        setXmlPreview(xmlData.value);
      } else {
        setXmlPreview(null);
      }
    } catch (error) {
      console.error('Error loading XML preview:', error);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 199)]);
  };

  const saveFTPSettings = async (values: FTPSettings) => {
    setIsLoading(true);
    addLog('שומר הגדרות FTP...');
    
    try {
      // Add lastUploaded to preserve the timestamp
      const settings = {
        ...values,
        lastUploaded: lastUploaded,
      };
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'ftp_settings', 
          value: JSON.stringify(settings)
        }, { onConflict: 'key' });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'הגדרות FTP נשמרו בהצלחה',
        description: 'כל ההגדרות נשמרו במסד הנתונים',
      });
      
      addLog('הגדרות FTP נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving FTP settings:', error);
      toast({
        title: 'שגיאה בשמירת הגדרות FTP',
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בשמירת הגדרות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testFTPConnection = async () => {
    setIsTesting(true);
    const values = form.getValues();
    addLog(`בודק חיבור ל-FTP: ${values.server}:${values.port}`);
    
    try {
      const response = await fetch('/api/test-ftp-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server: values.server,
          port: values.port,
          username: values.username,
          password: values.password,
          passive: values.passive,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'חיבור FTP הצליח',
          description: 'החיבור לשרת FTP נוצר בהצלחה',
        });
        
        addLog('חיבור FTP הצליח');
        if (result.directoryContents?.length > 0) {
          addLog(`תוכן תיקיה: ${result.directoryContents.join(', ')}`);
        }
      } else {
        throw new Error(result.error || 'שגיאה לא ידועה');
      }
    } catch (error) {
      console.error('Error testing FTP connection:', error);
      toast({
        title: 'שגיאה בחיבור FTP',
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בחיבור FTP: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const uploadXMLToFTP = async () => {
    setIsUploading(true);
    const values = form.getValues();
    addLog(`מעלה קובץ XML לשרת FTP: ${values.server}:${values.port}`);
    
    try {
      const response = await fetch('/api/upload-xml-ftp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server: values.server,
          port: values.port,
          username: values.username,
          password: values.password,
          remotePath: values.remotePath,
          passive: values.passive,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const now = new Date().toLocaleString();
        setLastUploaded(now);
        
        // Update the settings with the new timestamp
        const updatedSettings = {
          ...form.getValues(),
          lastUploaded: now,
        };
        
        await supabase
          .from('system_settings')
          .upsert({ 
            key: 'ftp_settings', 
            value: JSON.stringify(updatedSettings)
          }, { onConflict: 'key' });
        
        toast({
          title: 'קובץ XML הועלה בהצלחה',
          description: `הקובץ הועלה ב-${now}`,
        });
        
        addLog('קובץ XML הועלה בהצלחה');
      } else {
        throw new Error(result.error || 'שגיאה לא ידועה');
      }
    } catch (error) {
      console.error('Error uploading XML to FTP:', error);
      toast({
        title: 'שגיאה בהעלאת קובץ XML',
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בהעלאת קובץ XML: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const generateAndUpload = async () => {
    addLog('מייצר XML ומעלה לשרת FTP...');
    setIsUploading(true);
    
    try {
      // First, generate new XML
      const { data: xmlData, error: xmlError } = await supabase.functions.invoke('generate-schedule-xml');
      
      if (xmlError) {
        throw new Error(`שגיאה בייצור XML: ${xmlError.message}`);
      }
      
      addLog('XML יוצר בהצלחה, מעלה לשרת FTP...');
      await loadXmlPreview(); // Refresh XML preview
      
      // Then upload to FTP
      await uploadXMLToFTP();
    } catch (error) {
      console.error('Error generating and uploading XML:', error);
      toast({
        title: 'שגיאה בייצור והעלאת XML',
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בייצור והעלאת XML: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleAutoUpload = async () => {
    const currentValue = form.getValues('autoUpload');
    const newValue = !currentValue;
    
    form.setValue('autoUpload', newValue);
    
    // Save the updated setting
    await saveFTPSettings(form.getValues());
    
    // Update the scheduler if needed
    if (newValue) {
      addLog(`הפעלת העלאה אוטומטית כל ${form.getValues('interval')} דקות`);
      // Here you would set up the auto upload scheduler
      // This would need to be implemented on the server side with a cron job or similar
    } else {
      addLog('השבתת העלאה אוטומטית');
      // Here you would disable the auto upload scheduler
    }
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>העלאת XML ל-FTP</CardTitle>
        <CardDescription>
          הגדרת העלאה אוטומטית של לוח שידורים XML לשרת FTP חיצוני
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveFTPSettings)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="server"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שרת FTP</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Server className="h-4 w-4 ml-2" />
                        <Input placeholder="ftp.example.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>פורט</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="21" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם משתמש</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 ml-2" />
                        <Input type="password" placeholder="••••••••" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="remotePath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>נתיב בשרת</FormLabel>
                  <FormControl>
                    <Input placeholder="/public_html/xml" {...field} />
                  </FormControl>
                  <FormDescription>
                    הנתיב לתיקיה בשרת FTP היעד (השאר / לתיקיה הראשית)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="passive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none mr-3">
                      <FormLabel>
                        <div className="flex items-center">
                          <ArrowUpDown className="h-4 w-4 ml-2" />
                          חיבור פסיבי
                        </div>
                      </FormLabel>
                      <FormDescription>
                        מומלץ להשאיר מסומן עבור רוב שרתי ה-FTP
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="flex items-end space-x-2 pb-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testFTPConnection}
                  disabled={isTesting || !form.getValues('server')}
                >
                  {isTesting ? 'בודק...' : 'בדוק חיבור'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 ml-2" />
                  {isLoading ? 'שומר...' : 'שמור הגדרות'}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-6">
              <FormField
                control={form.control}
                name="autoUpload"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mr-2"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none flex-1">
                      <FormLabel className="font-medium">
                        העלאה אוטומטית
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מרווח זמן (דקות)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-semibold">תצוגה מקדימה של ה-XML</h3>
            {xmlPreview && (
              <div className="text-sm text-muted-foreground">
                אורך: {xmlPreview.length} תווים
              </div>
            )}
          </div>
          
          <div className="p-2 bg-muted rounded text-xs font-mono mt-2 overflow-x-auto max-h-40 overflow-y-auto">
            {xmlPreview ? (
              <pre className="whitespace-pre-wrap">{xmlPreview}</pre>
            ) : (
              <p className="text-muted-foreground">אין XML זמין. יש ליצור קודם.</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-semibold mb-2">לוג פעולות</h3>
          <div className="border rounded-md p-2 h-40 overflow-y-auto bg-muted/50 text-xs font-mono">
            {logs.length === 0 ? (
              <div className="text-muted-foreground p-2">אין פעולות לוג עדיין</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="py-1 border-b border-muted last:border-0">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
        <Button 
          onClick={uploadXMLToFTP} 
          disabled={isUploading || !form.getValues('server')}
          className="w-full sm:w-auto"
        >
          <Upload className={`h-4 w-4 ml-2`} />
          {isUploading ? 'מעלה...' : 'העלה עכשיו'}
        </Button>
        
        <Button 
          onClick={generateAndUpload} 
          variant="outline" 
          disabled={isUploading || !form.getValues('server')}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 ml-2" />
          {isUploading ? 'מעבד...' : 'צור והעלה מחדש'}
        </Button>
        
        <Button 
          onClick={toggleAutoUpload} 
          variant={form.getValues('autoUpload') ? "destructive" : "default"} 
          className="w-full sm:w-auto"
        >
          <Play className="h-4 w-4 ml-2" />
          {form.getValues('autoUpload') ? 'כבה העלאה אוטומטית' : 'הפעל העלאה אוטומטית'}
        </Button>
        
        {lastUploaded && (
          <span className="text-sm text-muted-foreground mr-auto mt-2 sm:mt-0">
            עודכן לאחרונה: {lastUploaded}
          </span>
        )}
      </CardFooter>
    </Card>
  );
};

export default FTPXMLSettings;
