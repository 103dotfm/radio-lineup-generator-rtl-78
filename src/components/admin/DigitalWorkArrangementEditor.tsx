import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DigitalWorkArrangement } from '@/types/schedule';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addWeeks, subWeeks, parse, startOfWeek } from 'date-fns';
import { toast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, Copy, Calendar, Link } from 'lucide-react';
import DigitalWorkArrangementView from '../schedule/DigitalWorkArrangementView';
import ComicSketchGenerator from '../schedule/workers/ComicSketchGenerator';

interface DigitalWorkArrangementEditorProps {
  selectedWeekStart?: string;
  onSelectWeek?: (weekStart: string) => void;
}

const DigitalWorkArrangementEditor: React.FC<DigitalWorkArrangementEditorProps> = ({
  selectedWeekStart,
  onSelectWeek
}) => {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (selectedWeekStart) {
      const date = parse(selectedWeekStart, 'yyyy-MM-dd', new Date());
      return startOfWeek(date, { weekStartsOn: 0 });
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  
  const [arrangement, setArrangement] = useState<DigitalWorkArrangement | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [footerText, setFooterText] = useState<string>('');
  const [footerImageUrl, setFooterImageUrl] = useState<string>('');
  const [comicPrompt, setComicPrompt] = useState<string>('');
  const [comicImageUrl, setComicImageUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState('editor');
  const [copied, setCopied] = useState(false);

  const fetchArrangement = useCallback(async () => {
    setLoading(true);
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setArrangement(data as DigitalWorkArrangement);
        setFooterText(data.footer_text || '');
        setFooterImageUrl(data.footer_image_url || '');
        setComicPrompt(data.comic_prompt || '');
        setComicImageUrl(data.comic_image_url || null);
        setNotes(data.notes || '');
      } else {
        setArrangement(null);
        setFooterText('');
        setFooterImageUrl('');
        setComicPrompt('');
        setComicImageUrl(null);
        setNotes('');
      }
    } catch (error) {
      console.error('Error fetching digital work arrangement:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch work arrangement',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchArrangement();
    
    if (onSelectWeek) {
      onSelectWeek(format(weekStart, 'yyyy-MM-dd'));
    }
  }, [weekStart, fetchArrangement, onSelectWeek]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      
      if (arrangement) {
        const { error } = await supabase
          .from('digital_work_arrangements')
          .update({
            footer_text: footerText,
            footer_image_url: footerImageUrl,
            comic_prompt: comicPrompt,
            comic_image_url: comicImageUrl,
            notes: notes,
          })
          .eq('id', arrangement.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('digital_work_arrangements')
          .insert([{
            week_start: weekStartStr,
            footer_text: footerText,
            footer_image_url: footerImageUrl,
            comic_prompt: comicPrompt,
            comic_image_url: comicImageUrl,
            notes: notes,
          }]);
        
        if (error) throw error;
      }
      
      toast({
        title: 'Success',
        description: 'Work arrangement saved successfully',
      });
      fetchArrangement();
    } catch (error) {
      console.error('Error saving digital work arrangement:', error);
      toast({
        title: 'Error',
        description: 'Failed to save work arrangement',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const handleComicImageGenerated = (imageUrl: string) => {
    setComicImageUrl(imageUrl);
  };

  const copyPublicLink = () => {
    const weekDateStr = format(weekStart, 'yyyy-MM-dd');
    const url = `${window.location.origin}/schedule/${weekDateStr}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Success',
        description: 'Public link copied to clipboard',
      });
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    });
  };

  const formattedWeekDate = format(weekStart, 'dd/MM/yyyy');

  const previewArrangement = arrangement ? {
    ...arrangement,
    shifts: [],
    custom_rows: []
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">סידור עבודה דיגיטל</h2>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronRight className="h-4 w-4 ml-1" />
              שבוע קודם
            </Button>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-5 w-5 ml-1" />
              <span>{formattedWeekDate}</span>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              שבוע הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </div>
          
          <DatePicker
            date={weekStart}
            onSelect={(date) => {
              if (date) {
                const startOfWeekDate = startOfWeek(date, { weekStartsOn: 0 });
                setWeekStart(startOfWeekDate);
              }
            }}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyPublicLink}
            className="flex items-center gap-1"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
            {copied ? 'הועתק!' : 'העתק קישור'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="editor">עריכה</TabsTrigger>
          <TabsTrigger value="preview">תצוגה מקדימה</TabsTrigger>
        </TabsList>
        <TabsContent value="editor" className="space-y-4 p-4 border rounded-md bg-background">
          {loading ? (
            <div className="text-center py-8">טוען...</div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">הערות כלליות</h3>
                <Textarea
                  placeholder="הזן הערות כלליות כאן..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">טקסט תחתית</h3>
                <Textarea
                  placeholder="הזן טקסט תחתית כאן..."
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="min-h-[100px] footer-text"
                  dir="rtl"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">תמונת תחתית (URL)</h3>
                <Input
                  placeholder="הזן URL לתמונת תחתית..."
                  value={footerImageUrl}
                  onChange={(e) => setFooterImageUrl(e.target.value)}
                  dir="rtl"
                />
                {footerImageUrl && (
                  <div className="mt-2">
                    <img 
                      src={footerImageUrl} 
                      alt="Footer preview" 
                      className="max-h-[200px] border rounded-md" 
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">פרומפט קומיקס</h3>
                <Textarea
                  placeholder="הזן פרומפט לקומיקס כאן..."
                  value={comicPrompt}
                  onChange={(e) => setComicPrompt(e.target.value)}
                  className="min-h-[100px]"
                  dir="rtl"
                />
                {comicPrompt && (
                  <ComicSketchGenerator 
                    initialText={comicPrompt}
                    onTextChange={(text) => setComicPrompt(text)}
                    onImageGenerated={handleComicImageGenerated}
                    existingImageUrl={comicImageUrl}
                    prompt={comicPrompt}
                  />
                )}
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="min-w-[120px]"
                >
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="preview" className="p-4 border rounded-md bg-background">
          <DigitalWorkArrangementView 
            weekDate={format(weekStart, 'yyyy-MM-dd')} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalWorkArrangementEditor;
