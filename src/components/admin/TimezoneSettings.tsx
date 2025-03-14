
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TimezoneSettingsProps {
  timezoneOffset: number;
  setTimezoneOffset: (offset: number) => void;
  serverTime: Date | null;
}

const TimezoneSettings = ({ timezoneOffset, setTimezoneOffset, serverTime }: TimezoneSettingsProps) => {
  const { toast } = useToast();
  const [savingOffset, setSavingOffset] = useState(false);

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

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2 text-right">
        <CardTitle className="text-xl flex items-center gap-2 justify-end">
          <Clock className="h-5 w-5" />
          הגדרות זמן מערכת
        </CardTitle>
        <CardDescription className="text-right">
          כוונון אזור זמן לשליחת הודעות דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6">
          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="server-time" className="block text-right">זמן שרת נוכחי:</Label>
            <div className="text-lg font-medium text-right" id="server-time">
              {serverTime ? serverTime.toLocaleTimeString('he-IL') : 'טוען...'}
            </div>
          </div>
          
          <div className="space-y-2 flex-1 text-right">
            <Label htmlFor="server-time-offset" className="block text-right">זמן שרת עם היסט:</Label>
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
      </CardContent>
    </Card>
  );
};

export default TimezoneSettings;
