import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Save, Upload, Play, Lock, ArrowUpDown, Server, FileJson, FileCode, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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

const ScheduleExportSettings = () => {
  const [activeTab, setActiveTab] = useState<string>("xml");
  const [refreshInterval, setRefreshInterval] = useState<string>('10');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [xmlTemplate, setXmlTemplate] = useState<string>('');
  const [jsonTemplate, setJsonTemplate] = useState<string>('');
  const { toast } = useToast();

  const ftpForm = useForm<FTPSettings>({
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
    const loadSettings = async () => {
      try {
        const { data: intervalData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_xml_refresh_interval')
          .maybeSingle();
          
        if (intervalData?.value) {
          setRefreshInterval(intervalData.value);
        }
        
        const { data: xmlData } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .maybeSingle();
          
        if (xmlData) {
          if (xmlData.updated_at) {
            const updateDate = new Date(xmlData.updated_at);
            setLastUpdated(updateDate.toLocaleString());
          }
          
          if (xmlData.value) {
            setXmlPreview(xmlData.value);
          }
        }
        
        const { data: xmlTemplateData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_xml_template')
          .maybeSingle();
          
        if (xmlTemplateData?.value) {
          setXmlTemplate(xmlTemplateData.value);
        } else {
          const defaultTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<schedule>
  <!-- For each show in the schedule -->
  <show>
    <date>%scheduledate</date>
    <start_time>%starttime</start_time>
    <end_time>%endtime</end_time>
    <name>%showname</name>
    <host>%showhosts</host>
    <combined>%showcombined</combined>
  </show>
</schedule>`;
          setXmlTemplate(defaultTemplate);
        }
        
        const { data: jsonData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_json')
          .maybeSingle();
          
        if (jsonData?.value) {
          setJsonPreview(jsonData.value);
        }
        
        const { data: jsonTemplateData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_json_template')
          .maybeSingle();
          
        if (jsonTemplateData?.value) {
          setJsonTemplate(jsonTemplateData.value);
        } else {
          const defaultJsonTemplate = `{
  "schedule": [
    {
      "date": "%scheduledate",
      "startTime": "%starttime",
      "endTime": "%endtime",
      "showName": "%showname",
      "hosts": "%showhosts",
      "combined": "%showcombined"
    }
  ]
}`;
          setJsonTemplate(defaultJsonTemplate);
        }
        
        const { data: ftpData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'ftp_settings')
          .maybeSingle();
          
        if (ftpData?.value) {
          try {
            const settings = JSON.parse(ftpData.value);
            ftpForm.reset({
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
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const saveRefreshInterval = async () => {
    try {
      const intervalNum = parseInt(refreshInterval);
      if (isNaN(intervalNum) || intervalNum < 1) {
        toast({
          title: 'ערך לא תקין',
          description: 'יש להזין מספר חיובי של דקות',
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml_refresh_interval', 
          value: refreshInterval 
        }, { onConflict: 'key' });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'הגדרות נשמרו בהצלחה',
        description: `מרווח רענון עודכן ל-${refreshInterval} דקות`,
      });
    } catch (error) {
      console.error('Error saving refresh interval:', error);
      toast({
        title: 'שגיאה בשמירת ההגדרות',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    }
  };

  const saveXmlTemplate = async () => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml_template', 
          value: xmlTemplate 
        }, { onConflict: 'key' });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'תבנית XML נשמרה בהצלחה',
      });

      await refreshXML();
    } catch (error) {
      console.error('Error saving XML template:', error);
      toast({
        title: 'שגיאה בשמירת תבנית XML',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    }
  };

  const saveJsonTemplate = async () => {
    try {
      try {
        JSON.parse(jsonTemplate);
      } catch (parseError) {
        toast({
          title: 'פורמט JSON שגוי',
          description: 'יש לוודא שהפורמט תקין לפני השמירה',
          variant: 'destructive',
        });
        return;
      }
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_json_template', 
          value: jsonTemplate 
        }, { onConflict: 'key' });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: 'תבנית JSON נשמרה בהצלחה',
      });

      await refreshJSON();
    } catch (error) {
      console.error('Error saving JSON template:', error);
      toast({
        title: 'שגיאה בשמירת תבנית JSON',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    }
  };

  const updateScheduler = async () => {
    setIsUpdatingSchedule(true);
    try {
      const intervalNum = parseInt(refreshInterval);
      if (!isNaN(intervalNum) && intervalNum >= 1) {
        await supabase
          .from('system_settings')
          .upsert({ 
            key: 'schedule_xml_refresh_interval', 
            value: refreshInterval 
          }, { onConflict: 'key' });
      }
      
      const { data, error } = await supabase.functions.invoke('schedule-xml-refresh', {
        body: { refreshInterval }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'מתזמן העדכונים הופעל',
        description: `קבצי ה-XML ו-JSON יתעדכנו כל ${refreshInterval} דקות`,
      });
      
      await refreshXML();
      await refreshJSON();
      
    } catch (error) {
      console.error('Error updating scheduler:', error);
      toast({
        title: 'שגיאה בהפעלת מתזמן העדכונים',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingSchedule(false);
    }
  };

  const refreshXML = async () => {
    setIsRefreshing(true);
    addLog('מרענן XML...');
    try {
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml_template', 
          value: xmlTemplate 
        }, { onConflict: 'key' });

      const { data, error } = await supabase.functions.invoke('generate-schedule-xml', {
        body: { template: xmlTemplate }
      });
      
      if (error) {
        throw error;
      }
      
      const { data: updatedData, error: getError } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
      
      if (getError) {
        throw getError;
      } else if (updatedData) {
        if (updatedData.updated_at) {
          const now = new Date(updatedData.updated_at);
          setLastUpdated(now.toLocaleString());
        }
        
        if (updatedData.value) {
          setXmlPreview(updatedData.value);
        }
      }
      
      toast({
        title: 'XML עודכן בהצלחה',
        description: `עודכן בתאריך ${new Date().toLocaleString()}`,
      });
      
      addLog('XML עודכן בהצלחה');
    } catch (error) {
      console.error('Error refreshing XML:', error);
      toast({
        title: 'שגיאה בעדכון ה-XML',
        description: error instanceof Error ? error.message : 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בעדכון ה-XML: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshJSON = async () => {
    setIsRefreshing(true);
    addLog('מרענן JSON...');
    try {
      await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_json_template', 
          value: jsonTemplate 
        }, { onConflict: 'key' });

      const { data, error } = await supabase.functions.invoke('generate-schedule-json', {
        body: { template: jsonTemplate }
      });
      
      if (error) {
        throw error;
      }
      
      const { data: updatedData, error: getError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'schedule_json')
        .maybeSingle();
      
      if (getError) {
        throw getError;
      } else if (updatedData) {
        if (updatedData.value) {
          setJsonPreview(updatedData.value);
        }
      }
      
      toast({
        title: 'JSON עודכן בהצלחה',
        description: `עודכן בתאריך ${new Date().toLocaleString()}`,
      });
      
      addLog('JSON עודכן בהצלחה');
    } catch (error) {
      console.error('Error refreshing JSON:', error);
      toast({
        title: 'שגיאה בעדכון ה-JSON',
        description: error instanceof Error ? error.message : 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בעדכון ה-JSON: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 199)]);
  };

  const saveFTPSettings = async (values: FTPSettings) => {
    setIsRefreshing(true);
    addLog('שומר הגדרות FTP...');
    
    try {
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
      setIsRefreshing(false);
    }
  };

  const testFTPConnection = async () => {
    setIsTesting(true);
    const values = ftpForm.getValues();
    addLog(`בודק חיבור ל-FTP: ${values.server}:${values.port}`);
    
    try {
      const reqData = {
        server: values.server,
        port: values.port,
        username: values.username,
        password: values.password,
        passive: values.passive,
      };
      
      addLog(`שולח בקשת חיבור FTP עם נתונים: ${JSON.stringify({
        server: values.server,
        port: values.port,
        username: values.username,
        passwordLength: values.password ? values.password.length : 0,
        passive: values.passive,
      })}`);

      const apiUrl = new URL('/api/test-ftp-connection', window.location.origin).href;
      addLog(`Sending request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqData),
      });
      
      addLog(`תשובה התקבלה עם קוד סטטוס: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type של התשובה: ${contentType}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        addLog(`Error response text: ${responseText.substring(0, 200)}...`);
        throw new Error(`Server responded with status ${response.status}: ${responseText.substring(0, 100)}`);
      }
      
      let responseText;
      try {
        responseText = await response.text();
        addLog(`RESPONSE RAW TEXT (first 200 chars): ${responseText.substring(0, 200)}...`);
      } catch (textError) {
        addLog(`Error getting response text: ${textError instanceof Error ? textError.message : 'Unknown error'}`);
        throw new Error('Failed to read response text');
      }
      
      let result;
      if (contentType && contentType.includes('application/json')) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          addLog(`שגיאה בפענוח JSON: ${parseError instanceof Error ? parseError.message : 'שגיאה לא ידועה'}`);
          throw new Error(`Failed to parse JSON response: ${responseText.substring(0, 100)}`);
        }
      } else {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`);
      }
      
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
      if (error instanceof Error && error.stack) {
        addLog(`Stack trace: ${error.stack}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const uploadXMLToFTP = async () => {
    setIsUploading(true);
    const values = ftpForm.getValues();
    addLog(`מעלה קובץ XML לשרת FTP: ${values.server}:${values.port}`);
    
    try {
      const reqData = {
        server: values.server,
        port: values.port,
        username: values.username,
        password: values.password,
        remotePath: values.remotePath,
        passive: values.passive,
        fileType: 'xml'
      };
      
      addLog(`שולח בקשת העלאת XML עם נתונים: ${JSON.stringify({
        server: values.server,
        port: values.port,
        username: values.username,
        passwordLength: values.password ? values.password.length : 0,
        remotePath: values.remotePath,
        passive: values.passive,
      })}`);

      const apiUrl = new URL('/api/upload-xml-ftp', window.location.origin).href;
      addLog(`Sending upload request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqData),
      });
      
      addLog(`תשובה התקבלה עם קוד סטטוס: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type של התשובה: ${contentType}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        addLog(`Error response text: ${responseText.substring(0, 200)}...`);
        throw new Error(`Server responded with status ${response.status}: ${responseText.substring(0, 100)}`);
      }
      
      let responseText;
      try {
        responseText = await response.text();
        addLog(`RESPONSE RAW TEXT (first 200 chars): ${responseText.substring(0, 200)}...`);
      } catch (textError) {
        addLog(`Error getting response text: ${textError instanceof Error ? textError.message : 'Unknown error'}`);
        throw new Error('Failed to read response text');
      }
      
      let result;
      if (contentType && contentType.includes('application/json')) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          addLog(`שגיאה בפענוח JSON: ${parseError instanceof Error ? parseError.message : 'שגיאה לא ידועה'}`);
          throw new Error(`Failed to parse JSON response: ${responseText.substring(0, 100)}`);
        }
      } else {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`);
      }
      
      if (result.success) {
        const now = new Date().toLocaleString();
        setLastUploaded(now);
        
        const updatedSettings = {
          ...ftpForm.getValues(),
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
      if (error instanceof Error && error.stack) {
        addLog(`Stack trace: ${error.stack}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const uploadJSONToFTP = async () => {
    setIsUploading(true);
    const values = ftpForm.getValues();
    addLog(`מעלה קובץ JSON לשרת FTP: ${values.server}:${values.port}`);
    
    try {
      const reqData = {
        server: values.server,
        port: values.port,
        username: values.username,
        password: values.password,
        remotePath: values.remotePath,
        passive: values.passive,
        fileType: 'json'
      };
      
      addLog(`שולח בקשת העלאת JSON עם נתונים: ${JSON.stringify({
        server: values.server,
        port: values.port,
        username: values.username,
        passwordLength: values.password ? values.password.length : 0,
        remotePath: values.remotePath,
        passive: values.passive,
      })}`);

      const apiUrl = new URL('/api/upload-xml-ftp', window.location.origin).href;
      addLog(`Sending JSON upload request to: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqData),
      });
      
      addLog(`תשובה התקבלה עם קוד סטטוס: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type של התשובה: ${contentType}`);
      
      if (!response.ok) {
        const responseText = await response.text();
        addLog(`Error response text: ${responseText.substring(0, 200)}...`);
        throw new Error(`Server responded with status ${response.status}: ${responseText.substring(0, 100)}`);
      }
      
      let responseText;
      try {
        responseText = await response.text();
        addLog(`RESPONSE RAW TEXT (first 200 chars): ${responseText.substring(0, 200)}...`);
      } catch (textError) {
        addLog(`Error getting response text: ${textError instanceof Error ? textError.message : 'Unknown error'}`);
        throw new Error('Failed to read response text');
      }
      
      let result;
      if (contentType && contentType.includes('application/json')) {
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          addLog(`שגיאה בפענוח JSON: ${parseError instanceof Error ? parseError.message : 'שגיאה לא ידועה'}`);
          throw new Error(`Failed to parse JSON response: ${responseText.substring(0, 100)}`);
        }
      } else {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`);
      }
      
      if (result.success) {
        const now = new Date().toLocaleString();
        setLastUploaded(now);
        
        const updatedSettings = {
          ...ftpForm.getValues(),
          lastUploaded: now,
        };
        
        await supabase
          .from('system_settings')
          .upsert({ 
            key: 'ftp_settings', 
            value: JSON.stringify(updatedSettings)
          }, { onConflict: 'key' });
        
        toast({
          title: 'קובץ JSON הועלה בהצלחה',
          description: `הקובץ הועלה ב-${now}`,
        });
        
        addLog('קובץ JSON הועלה בהצלחה');
      } else {
        throw new Error(result.error || 'שגיאה לא ידועה');
      }
    } catch (error) {
      console.error('Error uploading JSON to FTP:', error);
      toast({
        title: 'שגיאה בהעלאת קובץ JSON',
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בהעלאת קובץ JSON: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
      if (error instanceof Error && error.stack) {
        addLog(`Stack trace: ${error.stack}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const generateAndUpload = async (fileType: 'xml' | 'json') => {
    addLog(`מייצר ${fileType.toUpperCase()} ומעלה לשרת FTP...`);
    setIsUploading(true);
    
    try {
      if (fileType === 'xml') {
        await refreshXML();
      } else {
        await refreshJSON();
      }
      
      addLog(`${fileType.toUpperCase()} יוצר בהצלחה, מעלה לשרת FTP...`);
      
      if (fileType === 'xml') {
        await uploadXMLToFTP();
      } else {
        await uploadJSONToFTP();
      }
    } catch (error) {
      console.error(`Error generating and uploading ${fileType.toUpperCase()}:`, error);
      toast({
        title: `שגיאה בייצור והעלאת ${fileType.toUpperCase()}`,
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        variant: 'destructive',
      });
      
      addLog(`שגיאה בייצור והעלאת ${fileType.toUpperCase()}: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleAutoUpload = async () => {
    const currentValue = ftpForm.getValues('autoUpload');
    const newValue = !currentValue;
    
    ftpForm.setValue('autoUpload', newValue);
    
    await saveFTPSettings(ftpForm.getValues());
    
    if (newValue) {
      addLog(`הפעלת העלאה אוטומטית כל ${ftpForm.getValues('interval')} דקות`);
    } else {
      addLog('השבתת העלאה אוטומטית');
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="files" className="px-4 py-2">
            <FileCode className="h-4 w-4 ml-2" />
            קבצי לוח שידורים
          </TabsTrigger>
          <TabsTrigger value="templates" className="px-4 py-2">
            <FileJson className="h-4 w-4 ml-2" />
            תבניות
          </TabsTrigger>
          <TabsTrigger value="ftp" className="px-4 py-2">
            <Upload className="h-4 w-4 ml-2" />
            העלאה FTP
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="files">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>קובץ XML</CardTitle>
                <CardDescription>ניהול והצגת קובץ XML של לוח השידורים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="xml-url">כתובת הקובץ</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="xml-url" 
                      value={`${window.location.origin}/schedule.xml`}
                      readOnly 
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                        navigator.clipboard.writeText((e.target as HTMLInputElement).value);
                        toast({ title: 'הכתובת הועתקה ללוח' });
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="refresh-interval">מרווח רענון (דקות)</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="refresh-interval" 
                      type="number" 
                      min="1"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(e.target.value)}
                      className="w-24"
                    />
                    <Button onClick={saveRefreshInterval}>
                      <Clock className="h-4 w-4 ml-2" />
                      שמור
                    </Button>
                  </div>
                </div>
                
                {lastUpdated && (
                  <p className="text-sm text-muted-foreground">
                    עודכן לאחרונה: {lastUpdated}
                  </p>
                )}
                
                <div className="space-y-1">
                  <Label htmlFor="xml-preview">תוכן ה-XML</Label>
                  <div className="p-2 bg-muted rounded text-xs font-mono mt-2 overflow-x-auto max-h-60 overflow-y-auto">
                    {xmlPreview ? (
                      <pre className="whitespace-pre-wrap">{xmlPreview}</pre>
                    ) : (
                      <p className="text-muted-foreground">אין XML זמין. יש ליצור קודם.</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button 
                  onClick={() => refreshXML()} 
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'מרענן...' : 'רענן עכשיו'}
                </Button>
                
                <Button 
                  onClick={updateScheduler} 
                  variant="outline" 
                  disabled={isUpdatingSchedule}
                  className="w-full sm:w-auto"
                >
                  <Play className="h-4 w-4 ml-2" />
                  {isUpdatingSchedule ? 'מפעיל מתזמן...' : 'הפעל מתזמן'}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>קובץ JSON</CardTitle>
                <CardDescription>ניהול והצגת קובץ JSON של לוח השידורים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="json-url">כתובת הקובץ</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="json-url" 
                      value={`${window.location.origin}/schedule.json`}
                      readOnly 
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                        navigator.clipboard.writeText((e.target as HTMLInputElement).value);
                        toast({ title: 'הכתובת הועתקה ללוח' });
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="json-preview">תוכן ה-JSON</Label>
                  <div className="p-2 bg-muted rounded text-xs font-mono mt-2 overflow-x-auto max-h-60 overflow-y-auto">
                    {jsonPreview ? (
                      <pre className="whitespace-pre-wrap">{jsonPreview}</pre>
                    ) : (
                      <p className="text-muted-foreground">אין JSON זמין. יש ליצור קודם.</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button 
                  onClick={() => refreshJSON()} 
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'מרענן...' : 'רענן עכשיו'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>תבנית XML</CardTitle>
                <CardDescription>
                  עריכת תבנית קובץ XML. ניתן להשתמש בתגיות כגון %showname, %showhosts, %starttime, %endtime, %scheduledate, %showcombined
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="xml-template">תבנית XML</Label>
                  <Textarea 
                    id="xml-template"
                    value={xmlTemplate}
                    onChange={(e) => setXmlTemplate(e.target.value)}
                    className="font-mono text-sm h-80"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button 
                  onClick={saveXmlTemplate} 
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 ml-2" />
                  שמור תבנית
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>תבנית JSON</CardTitle>
                <CardDescription>
                  עריכת תבנית קובץ JSON. ניתן להשתמש בתגיות כגון %showname, %showhosts, %starttime, %endtime, %scheduledate, %showcombined
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="json-template">תבנית JSON</Label>
                  <Textarea 
                    id="json-template"
                    value={jsonTemplate}
                    onChange={(e) => setJsonTemplate(e.target.value)}
                    className="font-mono text-sm h-80"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button 
                  onClick={saveJsonTemplate} 
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 ml-2" />
                  שמור תבנית
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="ftp">
          <Card>
            <CardHeader>
              <CardTitle>העלאת קבצים ל-FTP</CardTitle>
              <CardDescription>
                הגדרת העלאה אוטומטית של קבצי לוח שידורים לשרת FTP חיצוני
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...ftpForm}>
                <form onSubmit={ftpForm.handleSubmit(saveFTPSettings)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={ftpForm.control}
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
                      control={ftpForm.control}
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
                      control={ftpForm.control}
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
                      control={ftpForm.control}
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
                    control={ftpForm.control}
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
                      control={ftpForm.control}
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
                        disabled={isTesting || !ftpForm.getValues('server')}
                      >
                        {isTesting ? 'בודק...' : 'בדוק חיבור'}
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={isRefreshing}
                      >
                        <Save className="h-4 w-4 ml-2" />
                        {isRefreshing ? 'שומר...' : 'שמור הגדרות'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t mt-6">
                    <FormField
                      control={ftpForm.control}
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
                      control={ftpForm.control}
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
            <CardFooter className="flex flex-wrap gap-2">
              <Button 
                onClick={() => uploadXMLToFTP()} 
                disabled={isUploading || !ftpForm.getValues('server')}
                className="w-full sm:w-auto"
              >
                <Upload className={`h-4 w-4 ml-2`} />
                {isUploading ? 'מעלה XML...' : 'העלה XML'}
              </Button>
              
              <Button 
                onClick={() => uploadJSONToFTP()} 
                disabled={isUploading || !ftpForm.getValues('server')}
                className="w-full sm:w-auto"
                variant="outline"
              >
                <Upload className={`h-4 w-4 ml-2`} />
                {isUploading ? 'מעלה JSON...' : 'העלה JSON'}
              </Button>
              
              <Button 
                onClick={() => generateAndUpload('xml')} 
                variant="outline" 
                disabled={isUploading || !ftpForm.getValues('server')}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                {isUploading ? 'מעבד XML...' : 'צור והעלה XML'}
              </Button>
              
              <Button 
                onClick={() => generateAndUpload('json')} 
                variant="outline" 
                disabled={isUploading || !ftpForm.getValues('server')}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                {isUploading ? 'מעבד JSON...' : 'צור והעלה JSON'}
              </Button>
              
              <Button 
                onClick={toggleAutoUpload} 
                variant={ftpForm.getValues('autoUpload') ? "destructive" : "default"} 
                className="w-full sm:w-auto mt-4 sm:mt-0 sm:mr-auto"
              >
                <Play className="h-4 w-4 ml-2" />
                {ftpForm.getValues('autoUpload') ? 'כבה העלאה אוטומטית' : 'הפעל העלאה אוטומטית'}
              </Button>
              
              {lastUploaded && (
                <span className="text-sm text-muted-foreground w-full text-center sm:text-right mt-2">
                  עודכן לאחרונה: {lastUploaded}
                </span>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScheduleExportSettings;
