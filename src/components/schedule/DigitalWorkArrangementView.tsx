
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addDays, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Define types for database work arrangements
type DBWorkArrangement = {
  id: string;
  week_start: string;
  created_at?: string;
  updated_at?: string;
  filename: string;
  url: string;
  type: string;
};

// Define internal work arrangement type
type WorkArrangement = {
  id: string;
  week_start: string;
  arrangement_data?: any;
  is_published: boolean;
};

const DigitalWorkArrangementView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentArrangement, setCurrentArrangement] = useState<WorkArrangement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchWorkArrangement();
  }, [selectedDate]);

  const fetchWorkArrangement = async () => {
    try {
      setLoading(true);
      
      // Format the date to match the database format (YYYY-MM-DD)
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const formattedDate = format(weekStart, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('work_arrangements')
        .select('*')
        .eq('week_start', formattedDate)
        .eq('type', 'published')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        // Transform data to match our WorkArrangement type
        let arrangement: WorkArrangement = {
          id: data.id,
          week_start: data.week_start,
          is_published: data.type === 'published',
          arrangement_data: null
        };
        
        // Try to extract arrangement data from URL or other source if needed
        // This would depend on how your data is structured
        
        setCurrentArrangement(arrangement);
      } else {
        setCurrentArrangement(null);
      }
    } catch (error: any) {
      console.error('Error fetching work arrangement:', error);
      setCurrentArrangement(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  // Generate the dates for the week
  const generateWeekDates = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };
  
  const weekDates = generateWeekDates();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">סידור עבודה שבועי</h1>
      
      <div className="flex justify-center items-center space-x-2 mb-6">
        <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <DatePicker 
          date={selectedDate} 
          onSelect={(date) => date && setSelectedDate(date)} 
        />
        
        <Button variant="outline" size="sm" onClick={handleNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center">טוען סידור עבודה...</div>
      ) : currentArrangement ? (
        <Card className="p-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border"></th>
                {weekDates.map((date, index) => (
                  <th key={index} className="p-2 border text-center">
                    {format(date, 'EEEE', { locale: he })}
                    <br />
                    {format(date, 'dd/MM', { locale: he })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Render work arrangement data here */}
              {currentArrangement.arrangement_data && 
               Array.isArray(currentArrangement.arrangement_data.shifts) && 
               currentArrangement.arrangement_data.shifts.map((shift: any, shiftIndex: number) => (
                <tr key={shiftIndex}>
                  <td className="p-2 border font-bold">
                    {shift.name} {shift.startTime}-{shift.endTime}
                  </td>
                  {Array.from({ length: 7 }, (_, dayIndex) => (
                    <td key={dayIndex} className="p-2 border text-center">
                      {shift.days[dayIndex]?.workers?.map((worker: string, workerIndex: number) => (
                        <div key={workerIndex}>{worker}</div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="text-center p-6 bg-gray-100 rounded-lg">
          אין סידור עבודה פורסם לשבוע זה
        </div>
      )}
    </div>
  );
};

export default DigitalWorkArrangementView;
