
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, Clock, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const ScheduleXMLSettings = () => {
  const [refreshInterval, setRefreshInterval] = useState<string>('10');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch the current refresh interval setting and XML data
    const fetchSettings = async () => {
      try {
        // Fetch refresh interval
        const { data: intervalData, error: intervalError } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_xml_refresh_interval')
          .maybeSingle();
          
        if (!intervalError && intervalData && intervalData.value) {
          setRefreshInterval(intervalData.value);
        }
        
        // Fetch XML data and last updated timestamp
        const { data: xmlData, error: xmlError } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .maybeSingle();
          
        if (!xmlError && xmlData) {
          if (xmlData.updated_at) {
            const updateDate = new Date(xmlData.updated_at);
            setLastUpdated(updateDate.toLocaleString());
          }
          
          if (xmlData.value) {
            // Set a preview of the XML (first 100 characters)
            setXmlPreview(xmlData.value.substring(0, 100) + '...');
          }
        }
      } catch (error) {
        console.error('Error fetching XML settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  const saveRefreshInterval = async () => {
    try {
      // Validate input
      const intervalNum = parseInt(refreshInterval);
      if (isNaN(intervalNum) || intervalNum < 1) {
        toast({
          title: 'ערך לא תקין',
          description: 'יש להזין מספר חיובי של דקות',
          variant: 'destructive',
        });
        return;
      }
      
      console.log('Saving refresh interval:', refreshInterval);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'schedule_xml_refresh_interval', 
          value: refreshInterval 
        }, { onConflict: 'key' });
        
      if (error) {
        console.error('Error saving refresh interval:', error);
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

  const updateScheduler = async () => {
    setIsUpdatingSchedule(true);
    try {
      console.log('Updating scheduler...');
      // Save the refresh interval first to ensure it's up to date
      const intervalNum = parseInt(refreshInterval);
      if (!isNaN(intervalNum) && intervalNum >= 1) {
        await supabase
          .from('system_settings')
          .upsert({ 
            key: 'schedule_xml_refresh_interval', 
            value: refreshInterval 
          }, { onConflict: 'key' });
      }
      
      // Call the Edge Function to update the scheduler
      const { data, error } = await supabase.functions.invoke('schedule-xml-refresh', {
        body: { refreshInterval }
      });
      
      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }
      
      console.log('Scheduler update response:', data);
      
      toast({
        title: 'מתזמן העדכונים הופעל',
        description: `קובץ ה-XML יתעדכן כל ${refreshInterval} דקות`,
      });
      
      // Refresh the XML data immediately after updating the scheduler
      await refreshXML();
      
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
    try {
      console.log('Refreshing XML...');
      // Call the Supabase Edge Function to generate the XML
      const { data, error } = await supabase.functions.invoke('generate-schedule-xml');
      
      if (error) {
        console.error('Error from generate function:', error);
        throw error;
      }
      
      console.log('XML refresh response length:', data ? data.length : 0);
      
      // Get the updated XML and timestamp
      const { data: updatedData, error: getError } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
      
      if (getError) {
        console.error('Error fetching updated XML:', getError);
      } else if (updatedData) {
        // Update last refreshed time
        if (updatedData.updated_at) {
          const now = new Date(updatedData.updated_at);
          setLastUpdated(now.toLocaleString());
        }
        
        // Set XML preview
        if (updatedData.value) {
          setXmlPreview(updatedData.value.substring(0, 100) + '...');
        }
      }
      
      toast({
        title: 'XML עודכן בהצלחה',
        description: `עודכן בתאריך ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error refreshing XML:', error);
      toast({
        title: 'שגיאה בעדכון ה-XML',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות Schedule XML</CardTitle>
        <CardDescription>
          ניהול קובץ XML של לוח השידורים המתעדכן אוטומטית
        </CardDescription>
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
              <Clock className="h-4 w-4 mr-2" />
              שמור
            </Button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            עודכן לאחרונה: {lastUpdated}
          </p>
        )}
        
        {xmlPreview && (
          <div className="p-2 bg-muted rounded text-xs font-mono mt-2 overflow-x-auto">
            <p className="whitespace-pre-wrap">{xmlPreview}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
        <Button 
          onClick={refreshXML} 
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'מרענן...' : 'רענן עכשיו'}
        </Button>
        
        <Button 
          onClick={updateScheduler} 
          variant="outline" 
          disabled={isUpdatingSchedule}
          className="w-full sm:w-auto"
        >
          <Play className="h-4 w-4 mr-2" />
          {isUpdatingSchedule ? 'מפעיל מתזמן...' : 'הפעל מתזמן'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScheduleXMLSettings;
