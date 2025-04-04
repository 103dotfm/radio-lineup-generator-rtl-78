
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
  url?: string;
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
        .eq('type', 'digital')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        // Transform data to match our WorkArrangement type
        const arrangement: WorkArrangement = {
          id: data.id,
          week_start: data.week_start,
          is_published: data.type === 'published',
          url: data.url,
          arrangement_data: null // This would be populated if needed
        };
        
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
      ) : currentArrangement && currentArrangement.url ? (
        <Card className="p-4 overflow-x-auto">
          <div className="w-full h-screen md:h-[800px]">
            <object data={currentArrangement.url} type="application/pdf" className="w-full h-full">
              <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500 mb-4">לא ניתן להציג את הקובץ במכשירך</p>
                <a href={currentArrangement.url} target="_blank" rel="noopener noreferrer" className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
                  הורד את הקובץ
                </a>
              </div>
            </object>
          </div>
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
