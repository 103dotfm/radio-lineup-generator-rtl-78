
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RefreshCw, ExternalLink, Clipboard, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const ScheduleXMLSettings = () => {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullXml, setFullXml] = useState<string | null>(null);
  const [showFullXml, setShowFullXml] = useState(false);
  const [xmlError, setXmlError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchXmlData();
  }, []);

  const fetchXmlData = async () => {
    try {
      setXmlError(null);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching XML data:', error);
        setXmlError('Error fetching XML data: ' + error.message);
        return;
      }
        
      if (data) {
        if (data.updated_at) {
          const updateDate = new Date(data.updated_at);
          setLastUpdated(updateDate.toLocaleString());
        }
        
        if (data.value) {
          setFullXml(data.value);
          // Set a preview of the XML (first 200 characters)
          setXmlPreview(data.value.substring(0, 200) + '...');
        } else {
          setXmlError('No XML data found in database. Try refreshing the XML.');
        }
      } else {
        setXmlError('No XML data found. Try refreshing the XML.');
      }
    } catch (error) {
      console.error('Error fetching XML data:', error);
      setXmlError('Error fetching XML data: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const refreshXML = async () => {
    setIsRefreshing(true);
    setXmlError(null);
    try {
      // Make a direct API call to the server endpoint for refreshing XML
      const response = await fetch('/api/refresh-schedule-xml');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        await fetchXmlData(); // Refresh the displayed data
        toast({
          title: 'XML עודכן בהצלחה',
          description: 'קובץ ה-XML עודכן ונשמר במסד הנתונים',
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error refreshing XML:', error);
      setXmlError('Error refreshing XML: ' + (error instanceof Error ? error.message : String(error)));
      toast({
        title: 'שגיאה בעדכון ה-XML',
        description: 'אנא נסה שנית מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const testXmlUrl = () => {
    // Use absolute URL with origin to ensure correct path
    const xmlUrl = `${window.location.origin}/schedule.xml`;
    window.open(xmlUrl, '_blank');
  };
  
  const copyXmlUrl = () => {
    const xmlUrl = `${window.location.origin}/schedule.xml`;
    navigator.clipboard.writeText(xmlUrl);
    setCopied(true);
    toast({
      title: 'הכתובת הועתקה ללוח',
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const showXmlDetails = () => {
    setShowFullXml(true);
  };

  return (
    <>
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
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Input 
                id="xml-url" 
                value={`${window.location.origin}/schedule.xml`}
                readOnly 
                className="font-mono text-sm flex-grow"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyXmlUrl}
                className="min-w-[40px]"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              עודכן לאחרונה: {lastUpdated}
            </p>
          )}
          
          {xmlError && (
            <div className="p-3 bg-destructive/15 rounded text-sm mt-2 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive">{xmlError}</p>
            </div>
          )}
          
          {xmlPreview && (
            <>
              <div className="p-3 bg-muted rounded text-xs font-mono mt-2 overflow-x-auto max-h-[200px] overflow-y-auto">
                <pre className="whitespace-pre-wrap">{xmlPreview}</pre>
              </div>
              <Button variant="ghost" size="sm" onClick={showXmlDetails} className="text-xs">
                הצג XML מלא
              </Button>
            </>
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
            בדיקת קובץ ה-XML
          </Button>
        </CardFooter>
      </Card>

      <Sheet open={showFullXml} onOpenChange={setShowFullXml}>
        <SheetContent className="w-[90%] max-w-4xl" side="right">
          <SheetHeader>
            <SheetTitle>קובץ XML מלא</SheetTitle>
            <SheetDescription>
              תצוגה מלאה של קובץ ה-XML של לוח השידורים
            </SheetDescription>
          </SheetHeader>
          {fullXml ? (
            <div className="p-3 bg-muted rounded text-xs font-mono mt-6 overflow-x-auto h-[calc(100vh-180px)] overflow-y-auto">
              <pre className="whitespace-pre-wrap">{fullXml}</pre>
            </div>
          ) : (
            <p className="text-center text-muted-foreground mt-4">אין נתוני XML זמינים</p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ScheduleXMLSettings;
