
import React, { useState, useEffect, useCallback } from 'react';
import { format, parse } from 'date-fns';
import { he } from 'date-fns/locale';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { DigitalWorkArrangement } from '@/types/schedule';

interface DigitalWorkArrangementViewProps {
  weekDate?: string;
}

const DigitalWorkArrangementView: React.FC<DigitalWorkArrangementViewProps> = ({ weekDate: propWeekDate }) => {
  const { weekDate: paramWeekDate } = useParams<{ weekDate: string }>();
  const weekDate = propWeekDate || paramWeekDate;
  const [arrangement, setArrangement] = useState<DigitalWorkArrangement | null>(null);
  const [notes, setNotes] = useState('');
  const [footerText, setFooterText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Cleanup function to ensure pointer-events are reset when component unmounts
  useEffect(() => {
    return () => {
      // Ensure pointer-events are reset when component unmounts
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, []);

  useEffect(() => {
    fetchArrangement();
  }, [weekDate]);

  useEffect(() => {
    if (arrangement) {
      setNotes(arrangement.notes || '');
      setFooterText(arrangement.footer_text || '');
    }
  }, [arrangement]);

  const fetchArrangement = useCallback(async () => {
    if (!weekDate) return;

    const parsedDate = parse(weekDate, 'yyyy-MM-dd', new Date());
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', formattedDate)
        .single();

      if (error) {
        console.error("Error fetching arrangement:", error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בטעינת סידור העבודה",
          variant: "destructive"
        });
      }

      if (data) {
        setArrangement(data);
      }
    } catch (error) {
      console.error("Error fetching arrangement:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת סידור העבודה",
        variant: "destructive"
      });
    }
  }, [weekDate, toast]);

  const saveChanges = async () => {
    if (!arrangement) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({
          notes: notes,
          footer_text: footerText
        })
        .eq('id', arrangement.id);

      if (error) {
        throw error;
      }

      toast({
        title: "הצלחה",
        description: "השינויים נשמרו בהצלחה",
      });
      fetchArrangement();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת השינויים",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 digital-work-arrangement-view" dir="rtl">
      <h2 className="text-2xl font-bold text-center">סידור עבודה דיגיטל</h2>
      
      <Card className="space-y-4">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">הערות</h3>
            <Textarea 
              placeholder="הזן הערות לסידור העבודה..." 
              className="min-h-[100px] text-right"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">טקסט תחתון</h3>
            <Textarea 
              placeholder="הזן טקסט שיוצג בתחתית המסמך..." 
              className="min-h-[80px] text-right"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          onClick={saveChanges} 
          disabled={isSaving}
        >
          {isSaving ? "שומר..." : "שמור שינויים"}
        </Button>
      </div>
    </div>
  );
};

export default DigitalWorkArrangementView;
