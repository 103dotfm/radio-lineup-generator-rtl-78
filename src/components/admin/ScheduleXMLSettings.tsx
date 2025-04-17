
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const ScheduleXMLSettings = () => {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchXmlData();
  }, []);

  const fetchXmlData = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
        
      if (!error && data) {
        if (data.updated_at) {
          const updateDate = new Date(data.updated_at);
          setLastUpdated(updateDate.toLocaleString());
        }
        
        if (data.value) {
          // Set a preview of the XML (first 100 characters)
          setXmlPreview(data.value.substring(0, 100) + '...');
        }
      }
    } catch (error) {
      console.error('Error fetching XML data:', error);
    }
  };

  const refreshXML = async () => {
    setIsRefreshing(true);
    try {
      // Open the ScheduleXML page in a new tab which will regenerate the XML
      window.open('/schedule-xml', '_blank');
      
      // Wait a moment for the XML to be generated
      setTimeout(async () => {
        await fetchXmlData();
        toast({
          title: 'XML עודכן',
          description: 'נא לבדוק את התוצאה בכתובת ה-XML',
        });
        setIsRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('Error refreshing XML:', error);
      toast({
        title: 'שגיאה בעדכון ה-XML',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
      setIsRefreshing(false);
    }
  };

  const testXmlUrl = () => {
    const xmlUrl = `${window.location.origin}/schedule.xml`;
    window.open(xmlUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות Schedule XML</CardTitle>
        <CardDescription>
          ניהול קובץ XML של לוח השידורים
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
          onClick={testXmlUrl} 
          variant="outline" 
          className="w-full sm:w-auto"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          בדוק את קובץ ה-XML
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScheduleXMLSettings;
