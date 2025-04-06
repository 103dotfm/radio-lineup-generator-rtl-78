import React, { useState, useEffect, useCallback } from 'react';
import { format, parse } from 'date-fns';
import { he } from 'date-fns/locale';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import ComicSketchGenerator from './workers/ComicSketchGenerator';
import { DigitalWorkArrangement } from '@/types/schedule';

const DigitalWorkArrangementView: React.FC = () => {
  const { weekDate } = useParams<{ weekDate: string }>();
  const [arrangement, setArrangement] = useState<DigitalWorkArrangement | null>(null);
  const [notes, setNotes] = useState('');
  const [footerText, setFooterText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

      setArrangement(data);
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

  const handleComicImageGenerated = async (imageUrl: string) => {
    if (!arrangement) return;

    try {
      const { error } = await supabase
        .from('digital_work_arrangements')
        .update({
          comic_image_url: imageUrl
        })
        .eq('id', arrangement.id);

      if (error) {
        throw error;
      }

      toast({
        title: "הצלחה",
        description: "תמונת הקומיקס נשמרה בהצלחה",
      });
      fetchArrangement();
    } catch (error) {
      console.error("Error saving comic image URL:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת תמונת הקומיקס",
        variant: "destructive"
      });
    }
  };

  const ComicImageSection = ({ arrangement }: { arrangement: DigitalWorkArrangement | null }) => {
    return (
      <div className="comic-image-section">
        {arrangement?.comic_image_url ? (
          <img 
            src={arrangement.comic_image_url} 
            alt="Comic sketch" 
            className="w-full h-auto rounded-md comic-sketch-preview"
          />
        ) : (
          <div className="flex items-center justify-center h-32 bg-gray-100 rounded-md">
            <p className="text-gray-500">אין תמונת קומיקס זמינה</p>
          </div>
        )}
      </div>
    );
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
      
      <Card className="space-y-4">
        <CardContent className="space-y-4">
          <h3 className="text-lg font-semibold">יצירת קומיקס אוטומטי</h3>
          <ComicSketchGenerator 
            initialText={arrangement?.comic_prompt || ""}
            initialImageUrl={arrangement?.comic_image_url || null}
            arrangementId={arrangement?.id}
            onTextChange={(text) => {
              setArrangement(prev => ({ ...prev, comic_prompt: text } as DigitalWorkArrangement));
            }}
            onImageGenerated={handleComicImageGenerated}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <ComicImageSection arrangement={arrangement} />
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
