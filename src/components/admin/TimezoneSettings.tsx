
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimezoneSettingsProps {
  timezoneOffset: number;
  setTimezoneOffset: (offset: number) => void;
  serverTime: Date | null;
}

const TimezoneSettings = ({ timezoneOffset, setTimezoneOffset, serverTime }: TimezoneSettingsProps) => {
  const { toast } = useToast();
  const [savingOffset, setSavingOffset] = useState(false);
  const [serverTimeRefreshedAt, setServerTimeRefreshedAt] = useState<Date>(new Date());

  // Refresh the time display every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setServerTimeRefreshedAt(new Date());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const saveTimezoneOffset = async () => {
    try {
      setSavingOffset(true);

      const { data: existingData, error: checkError } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'timezone_offset')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let saveError;

      if (existingData) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: timezoneOffset.toString() })
          .eq('key', 'timezone_offset');
        
        saveError = error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'timezone_offset', value: timezoneOffset.toString() });
        
        saveError = error;
      }

      if (saveError) throw saveError;

      toast({
        title: "הגדרות אזור זמן נשמרו בהצלחה",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error saving timezone offset:', error);
      toast({
        title: "שגיאה בשמירת הגדרות אזור זמן",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingOffset(false);
    }
  };

  const formatLocalTime = (date: Date | null) => {
    if (!date) return '';

    const offsetDate = new Date(date.getTime());
    offsetDate.setHours(offsetDate.getHours() + timezoneOffset);
    return offsetDate.toLocaleTimeString('he-IL');
  };

  // Get the server time in Israel timezone (UTC+3)
  const getIsraelTime = (date: Date | null) => {
    if (!date) return '';
    
    // Create a new date object to avoid modifying the original
    const israelTime = new Date(date.getTime());
    
    // Get the UTC time
    const utcHours = israelTime.getUTCHours();
    
    // Calculate Israel time (UTC+3)
    const israelHours = (utcHours + 3) % 24;
    
    // Set the hours to Israel time
    israelTime.setHours(israelHours);
    
    return israelTime.toLocaleTimeString('he-IL');
  };

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2 text-right">
        <CardTitle className="text-xl flex items-center gap-2 justify-end">
          <Clock className="h-5 w-5" />
          הגדרות זמן מערכת
        </CardTitle>
        <CardDescription className="text-right flex items-center justify-end gap-2">
          כוונון אזור זמן לשליחת הודעות דואר אלקטרוני
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="h-4 w-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent align="end" className="max-w-sm">
                <p className="text-sm text-right">
                  הגדרה זו משפיעה על זמן שליחת המיילים האוטומטיים. שינוי ערך ההיסט משנה את הזמן בו נשלחים המיילים ביחס לזמן התוכנית בלוח.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="server-time-utc" className="block text-right">זמן שרת (UTC):</Label>
            <div className="text-lg font-medium text-right" id="server-time-utc">
              {serverTime ? serverTime.toISOString() : 'טוען...'}
            </div>
          </div>

          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="server-time" className="block text-right">זמן ישראל (UTC+3):</Label>
            <div className="text-lg font-medium text-right" id="server-time">
              {serverTime ? getIsraelTime(serverTime) : 'טוען...'}
            </div>
          </div>
          
          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="server-time-offset" className="block text-right">זמן עם היסט:</Label>
            <div className="text-lg font-medium text-green-600 text-right" id="server-time-offset">
              {serverTime ? formatLocalTime(serverTime) : 'טוען...'}
            </div>
          </div>
          
          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="timezone-offset" className="block text-right">היסט שעות (מספר שלם):</Label>
            <div className="flex gap-2 justify-end">
              <Button onClick={saveTimezoneOffset} disabled={savingOffset}>
                {savingOffset ? "שומר..." : "שמור היסט"}
              </Button>
              <Input 
                id="timezone-offset" 
                type="number" 
                value={timezoneOffset} 
                onChange={e => setTimezoneOffset(parseInt(e.target.value) || 0)} 
                className="w-24 text-right" 
              />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-md text-right">
          <p className="text-sm text-amber-800">
            <strong>שים לב:</strong> מיילים אוטומטיים נשלחים בהתבסס על זמני השידור בלוח עם היסט הזמן. אם המיילים יוצאים מוקדם/מאוחר מדי, התאם את ערך ההיסט בהתאם.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimezoneSettings;
