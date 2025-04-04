
import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, Save, AlertCircle, Edit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id: string;
  section_name: string;
  content: string | null;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  shifts: Shift[];
  custom_rows: CustomRow[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const DAYS_OF_WEEK_WITH_DATES = ['30/03', '31/03', '01/04', '02/04', '03/04', '04/04'];

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SHIFT_TYPES = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  CUSTOM: 'custom'
};

const DEFAULT_SHIFTS = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      startTime: '07:00',
      endTime: '12:00'
    },
    [SHIFT_TYPES.AFTERNOON]: {
      startTime: '12:00',
      endTime: '16:00'
    },
    [SHIFT_TYPES.EVENING]: {
      weekdays: {
        startTime: '16:00',
        endTime: '22:00'
      },
      thursday: {
        startTime: '16:00',
        endTime: '21:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.RADIO_NORTH]: {
    default: {
      startTime: '09:00',
      endTime: '12:00'
    }
  },
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '13:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  },
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: {
    [SHIFT_TYPES.MORNING]: {
      weekdays: {
        startTime: '07:00',
        endTime: '14:00'
      },
      friday: {
        startTime: '08:00',
        endTime: '15:00'
      }
    },
    [SHIFT_TYPES.AFTERNOON]: {
      weekdays: {
        startTime: '14:00',
        endTime: '20:00'
      },
      friday: {
        exists: false
      }
    }
  }
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: '',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון 12:00-09:00',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים וכו\'',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים, סושיאל ועוד'
};

const DigitalWorkArrangement = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [footerImageUrl, setFooterImageUrl] = useState<string>('');
  
  const { toast } = useToast();
  
  useEffect(() => {
    fetchArrangement();
  }, [currentWeek]);
  
  const fetchArrangement = async () => {
    setIsLoading(true);
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    
    try {
      // Check if arrangement exists for this week
      const { data: existingArrangement, error: fetchError } = await supabase
        .from('digital_work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
        throw fetchError;
      }
      
      if (existingArrangement) {
        // Fetch shifts
        const { data: shifts, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
          
        if (shiftsError) throw shiftsError;
        
        // Fetch custom rows
        const { data: customRows, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', existingArrangement.id)
          .order('position', { ascending: true });
          
        if (customRowsError) throw customRowsError;
        
        setArrangement({
          ...existingArrangement,
          shifts: shifts || [],
          custom_rows: customRows || []
        });
        
        setNotes(existingArrangement.notes || '');
        setFooterText(existingArrangement.footer_text || '');
        setFooterImageUrl(existingArrangement.footer_image_url || '');
      } else {
        setArrangement(null);
        setNotes('');
        setFooterText('');
        setFooterImageUrl('');
      }
    } catch (error) {
      console.error('Error fetching arrangement:', error);
      toast({
        title: "שגיאה בטעינת סידור העבודה",
        description: "אירעה שגיאה בעת טעינת סידור העבודה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  // Template for a complete component, needs full implementation
  return (
    <Card>
      <CardHeader>
        <CardTitle>סידור עבודה דיגיטל</CardTitle>
        <CardDescription>עריכת סידור עבודה לצוות הדיגיטל</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            <ChevronRight className="mr-2 h-4 w-4" />
            שבוע קודם
          </Button>
          
          <div className="text-lg font-medium">
            שבוע {format(currentWeek, 'dd/MM/yyyy', { locale: he })} - {format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he })}
          </div>
          
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            שבוע הבא
            <ChevronLeft className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="text-center">
              <div className="mb-2">טוען סידור עבודה...</div>
            </div>
          </div>
        ) : (
          <div>
            {/* Digital Work Arrangement editor implementation */}
            <div className="mb-4">
              <p>יש להשלים את היישום של עורך סידור עבודה דיגיטל</p>
            </div>
            
            <Button disabled={isSaving} className="w-full">
              {isSaving ? 'שומר...' : 'שמירת סידור עבודה'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangement;
