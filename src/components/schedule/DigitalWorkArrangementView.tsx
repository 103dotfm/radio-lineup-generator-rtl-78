
import React, { useState, useEffect } from 'react';
import { format, parse, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import "@/styles/digital-work-arrangement.css";

interface DigitalWorkArrangementViewProps {
  weekDate?: string; // Format: 'yyyy-MM-dd'
}

interface Shift {
  id: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  start_time: string;
  end_time: string;
  person_name: string | null;
  additional_text: string | null;
  is_custom_time: boolean;
  is_hidden: boolean;
  position: number;
}

interface CustomRow {
  id: string;
  section_name: string;
  day_of_week: number | null;
  content: string | null;
  position: number;
}

interface WorkArrangement {
  id: string;
  week_start: string;
  notes: string | null;
  footer_text: string | null;
  footer_image_url: string | null;
  sketch_prompt: string | null;
  sketch_url: string | null;
  shifts: Shift[];
  custom_rows: CustomRow[];
}

const DAYS_OF_WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const SECTION_NAMES = {
  DIGITAL_SHIFTS: 'digital_shifts',
  RADIO_NORTH: 'radio_north',
  TRANSCRIPTION_SHIFTS: 'transcription_shifts',
  LIVE_SOCIAL_SHIFTS: 'live_social_shifts'
};

const SECTION_TITLES = {
  [SECTION_NAMES.DIGITAL_SHIFTS]: '',
  [SECTION_NAMES.RADIO_NORTH]: 'רדיו צפון 12:00-09:00',
  [SECTION_NAMES.TRANSCRIPTION_SHIFTS]: 'משמרות תמלולים וכו\'',
  [SECTION_NAMES.LIVE_SOCIAL_SHIFTS]: 'משמרות לייבים, סושיאל ועוד'
};

const DigitalWorkArrangementView: React.FC<DigitalWorkArrangementViewProps> = ({ weekDate }) => {
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekDate) {
      try {
        const parsedDate = parse(weekDate, 'yyyy-MM-dd', new Date());
        return startOfWeek(parsedDate, { weekStartsOn: 0 });
      } catch (e) {
        console.error('Error parsing weekDate:', e);
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  
  const [arrangement, setArrangement] = useState<WorkArrangement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  
  // Calculate week dates for display in header
  useEffect(() => {
    const dates = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + i);
      return format(date, 'dd/MM', { locale: he });
    });
    setWeekDates(dates);
  }, [currentWeek]);
  
  // Format date for display
  const formatDateRange = () => {
    if (!currentWeek) return '';
    
    const startDay = format(currentWeek, 'dd', { locale: he });
    const endDate = new Date(currentWeek);
    endDate.setDate(endDate.getDate() + 5); // Friday
    const endDay = format(endDate, 'dd', { locale: he });
    const month = format(currentWeek, 'MMMM yyyy', { locale: he });
    return `${endDay}-${startDay} ב${month}`;
  };
  
  // Fetch arrangement
  useEffect(() => {
    const fetchArrangement = async () => {
      setIsLoading(true);
      
      try {
        const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
        
        // Fetch arrangement
        const { data: arrangementData, error: arrangementError } = await supabase
          .from('digital_work_arrangements')
          .select('*')
          .eq('week_start', weekStartStr)
          .single();
        
        if (arrangementError) {
          if (arrangementError.code === 'PGRST116') { // No rows returned
            setArrangement(null);
            setIsLoading(false);
            return;
          }
          throw arrangementError;
        }
        
        // Fetch shifts
        const { data: shifts, error: shiftsError } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', arrangementData.id)
          .order('position', { ascending: true });
        
        if (shiftsError) throw shiftsError;
        
        // Fetch custom rows
        const { data: customRows, error: customRowsError } = await supabase
          .from('digital_shift_custom_rows')
          .select('*')
          .eq('arrangement_id', arrangementData.id)
          .order('position', { ascending: true });
        
        if (customRowsError) throw customRowsError;
        
        setArrangement({
          ...arrangementData,
          shifts: shifts || [],
          custom_rows: customRows || []
        });
      } catch (error) {
        console.error('Error fetching arrangement:', error);
        setArrangement(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchArrangement();
  }, [currentWeek]);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">טוען...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!arrangement) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">לא נמצא לוח משמרות לשבוע זה</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="digital-work-arrangement-view" dir="rtl">
      <h2 className="text-2xl font-bold text-center mb-2">לוח משמרות דיגיטל</h2>
      <div className="text-center mb-4">{formatDateRange()}</div>
      
      {/* Digital Shifts Table */}
      <div className="mb-6 overflow-x-auto">
        <Table className="border w-full">
          <TableHeader>
            <TableRow className="bg-black text-white">
              {DAYS_OF_WEEK.map((day, index) => (
                <TableHead key={day} className="text-center text-white border">
                  <div>{day}</div>
                  <div className="text-sm">{weekDates[index]}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Morning shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'morning'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`morning-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`morning-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            {/* Afternoon shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'afternoon'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`afternoon-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            {/* Evening shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                if (day === 5) {
                  return <TableCell key={`evening-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.DIGITAL_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'evening'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`evening-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`evening-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      
      {/* Radio North Table */}
      <div className="mb-6 overflow-x-auto">
        <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.RADIO_NORTH]}</div>
        <Table className="border w-full">
          <TableBody>
            <TableRow>
              {[...Array(5)].map((_, day) => {
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.RADIO_NORTH && 
                       s.day_of_week === day
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`radio-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`radio-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="p-2 border text-center">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      
      {/* Transcription Shifts Table */}
      <div className="mb-6 overflow-x-auto">
        <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.TRANSCRIPTION_SHIFTS]}</div>
        <Table className="border w-full">
          <TableBody>
            {/* Morning shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'morning'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`trans-morning-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`trans-morning-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            
            {/* Afternoon shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                if (day === 5) {
                  return <TableCell key={`trans-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'afternoon'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`trans-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`trans-afternoon-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
        
        {/* Free text by day */}
        <Table className="border w-full mt-2">
          <TableBody>
            <TableRow>
              {[...Array(6)].map((_, day) => {
                const customRow = arrangement.custom_rows.find(
                  row => row.section_name === SECTION_NAMES.TRANSCRIPTION_SHIFTS && 
                         row.day_of_week === day
                );
                
                return (
                  <TableCell key={`freetext-${day}`} className="p-2 border text-center">
                    {customRow?.content || ''}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      
      {/* Live Social Shifts Table */}
      <div className="mb-6 overflow-x-auto">
        <div className="font-bold mb-2">{SECTION_TITLES[SECTION_NAMES.LIVE_SOCIAL_SHIFTS]}</div>
        <Table className="border w-full">
          <TableBody>
            {/* Morning shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'morning'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`social-morning-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`social-morning-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            
            {/* Afternoon shift row */}
            <TableRow>
              {[...Array(6)].map((_, day) => {
                if (day === 5) {
                  return <TableCell key={`social-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                const shift = arrangement.shifts.find(
                  s => s.section_name === SECTION_NAMES.LIVE_SOCIAL_SHIFTS && 
                       s.day_of_week === day && 
                       s.shift_type === 'afternoon'
                );
                
                if (!shift || shift.is_hidden) {
                  return <TableCell key={`social-afternoon-${day}`} className="p-2 border text-center">-</TableCell>;
                }
                
                return (
                  <TableCell key={`social-afternoon-${day}`} className="p-2 border text-center">
                    <div className={`flex justify-center mb-1 ${shift.is_custom_time ? 'font-bold' : ''}`}>
                      <span>{shift.start_time.substring(0, 5)}-{shift.end_time.substring(0, 5)}</span>
                    </div>
                    <div className="font-bold">{shift.person_name || '-'}</div>
                    {shift.additional_text && (
                      <div className="text-sm">{shift.additional_text}</div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      
      {/* Footer Section */}
      {(arrangement.footer_text || arrangement.sketch_url || arrangement.footer_image_url) && (
        <div className="mt-8 space-y-4">
          {arrangement.footer_text && (
            <div className="text-center whitespace-pre-line">
              {arrangement.footer_text}
            </div>
          )}
          
          {arrangement.sketch_url && (
            <div className="flex justify-center my-4">
              <img 
                src={arrangement.sketch_url} 
                alt="איור מצחיק"
                className="max-h-60 object-contain" 
              />
            </div>
          )}
          
          {arrangement.footer_image_url && (
            <div className="flex justify-center">
              <img 
                src={arrangement.footer_image_url} 
                alt="תמונת כותרת תחתונה"
                className="max-h-40 object-contain" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DigitalWorkArrangementView;

