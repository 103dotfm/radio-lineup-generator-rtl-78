
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parse, startOfWeek, addDays, addWeeks, subWeeks, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Printer, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScheduleView from '@/components/schedule/ScheduleView';
import { supabase } from "@/integrations/supabase/client";

type ArrangementType = 'producers' | 'engineers' | 'digital';

interface ArrangementFile {
  id: string;
  filename: string;
  url: string;
  type: ArrangementType;
  week_start: string;
  created_at?: string;
  updated_at?: string;
}

const SchedulePage = () => {
  const {
    weekDate
  } = useParams<{
    weekDate: string;
  }>();
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekDate) {
      const parsedDate = parse(weekDate, 'yyyy-MM-dd', new Date());
      return isValid(parsedDate) ? startOfWeek(parsedDate, {
        weekStartsOn: 0
      }) : startOfWeek(new Date(), {
        weekStartsOn: 0
      });
    }
    return startOfWeek(new Date(), {
      weekStartsOn: 0
    });
  });
  const [arrangements, setArrangements] = useState<Record<ArrangementType, ArrangementFile | null>>({
    producers: null,
    engineers: null,
    digital: null
  });
  const [selectedTab, setSelectedTab] = useState("schedule");

  useEffect(() => {
    fetchArrangements();
  }, [currentWeek]);

  useEffect(() => {
    // Update URL when week changes
    const formattedDate = format(currentWeek, 'yyyy-MM-dd');
    if (weekDate !== formattedDate) {
      navigate(`/schedule/${formattedDate}`, {
        replace: true
      });
    }
  }, [currentWeek, navigate, weekDate]);

  const fetchArrangements = async () => {
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    try {
      const {
        data,
        error
      } = await supabase.from('work_arrangements').select('*').eq('week_start', weekStartStr);
      if (error) {
        console.error('Error fetching arrangements:', error);
        return;
      }
      const arrangementsRecord: Record<ArrangementType, ArrangementFile | null> = {
        producers: null,
        engineers: null,
        digital: null
      };
      if (data && data.length > 0) {
        data.forEach(item => {
          const arrangementItem = item as unknown as ArrangementFile;
          if (arrangementItem.type === 'producers' || arrangementItem.type === 'engineers' || arrangementItem.type === 'digital') {
            arrangementsRecord[arrangementItem.type] = arrangementItem;
          }
        });
      }
      console.log('Fetched arrangements:', arrangementsRecord);
      setArrangements(arrangementsRecord);
    } catch (error) {
      console.error('Error in fetchArrangements:', error);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const weekStart = format(currentWeek, 'dd/MM/yyyy', {
    locale: he
  });
  const weekEnd = format(addDays(currentWeek, 6), 'dd/MM/yyyy', {
    locale: he
  });

  const handlePrint = () => {
    window.print();
  };

  const renderPdfViewer = (url: string | null) => {
    if (!url) {
      return <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">אין קובץ זמין לשבוע זה</p>
        </div>;
    }
    return <div className="w-full h-screen md:h-[800px]">
        <object data={url} type="application/pdf" className="w-full h-full">
          <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
            <p className="text-gray-500 mb-4">לא ניתן להציג את הקובץ במכשירך</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
              הורד את הקובץ
            </a>
          </div>
        </object>
      </div>;
  };

  return <div className="container mx-auto px-4 py-8 schedule-page" dir="rtl">
      <header className="mb-8">
        <div className="logo-container mx-auto md:mx-0 md:w-auto w-1/2">
          <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103fm" className="topLogo" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-center md:text-right">לוח שידורים שבועי</h1>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center space-x-4 space-x-reverse md:mb-0 mb-2 text-center w-full md:w-auto">
            <Calendar className="h-5 w-5 ml-1" />
            <span>
              {weekStart} - {weekEnd}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse justify-center w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronRight className="h-4 w-4 ml-1" />
              שבוע קודם
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              שבוע הבא
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint} 
              className="hidden md:flex items-center"
            >
              <Printer className="h-4 w-4 ml-1" />
              הדפסת הלוח
            </Button>
          </div>
        </div>
      </header>
      
      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 schedTabs" dir="rtl">
            <TabsTrigger value="schedule" className="font-extrabold bg-slate-300 hover:bg-slate-200 mx-[15px]">לוח שידורים</TabsTrigger>
            <TabsTrigger value="producers" className="font-extrabold bg-blue-200 hover:bg-blue-100 mx-[15px]">סידור עבודה עורכים ומפיקים</TabsTrigger>
            <TabsTrigger value="engineers" className="bg-slate-300 hover:bg-slate-200 text-sm font-extrabold mx-[15px]">סידור עבודה טכנאים</TabsTrigger>
            <TabsTrigger value="digital" className="bg-blue-200 hover:bg-blue-100 font-extrabold mx-[15px]">סידור עבודה דיגיטל</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="mt-4 schedule-content">
            <div className="border rounded-lg overflow-hidden bg-white p-4">
              <ScheduleView selectedDate={currentWeek} hideDateControls hideHeaderDates={false} />
            </div>
          </TabsContent>
          
          <TabsContent value="producers" className="mt-4">
            {renderPdfViewer(arrangements.producers?.url || null)}
          </TabsContent>
          
          <TabsContent value="engineers" className="mt-4">
            {renderPdfViewer(arrangements.engineers?.url || null)}
          </TabsContent>
          
          <TabsContent value="digital" className="mt-4">
            {renderPdfViewer(arrangements.digital?.url || null)}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Mobile Dropdown and Content */}
      <div className="block md:hidden">
        <div className="mb-4">
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="בחר תצוגה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="schedule">לוח שידורים</SelectItem>
              <SelectItem value="producers">סידור עבודה עורכים ומפיקים</SelectItem>
              <SelectItem value="engineers">סידור עבודה טכנאים</SelectItem>
              <SelectItem value="digital">סידור עבודה דיגיטל</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="mt-4">
          {selectedTab === "schedule" && (
            <div className="border rounded-lg overflow-hidden bg-white p-2 schedule-content">
              <ScheduleView selectedDate={currentWeek} hideDateControls hideHeaderDates={false} />
            </div>
          )}
          
          {selectedTab === "producers" && renderPdfViewer(arrangements.producers?.url || null)}
          
          {selectedTab === "engineers" && renderPdfViewer(arrangements.engineers?.url || null)}
          
          {selectedTab === "digital" && renderPdfViewer(arrangements.digital?.url || null)}
        </div>
      </div>
    </div>;
};

export default SchedulePage;
