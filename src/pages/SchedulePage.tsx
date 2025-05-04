
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parse, startOfWeek, addDays, addWeeks, subWeeks, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from "@/lib/supabase";
import { Calendar } from 'lucide-react';

import ScheduleHeader from '@/components/schedule/ScheduleHeader';
import WeekNavigation from '@/components/schedule/WeekNavigation';
import DesktopTabs from '@/components/schedule/DesktopTabs';
import MobileTabs from '@/components/schedule/MobileTabs';

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
  const { weekDate } = useParams<{ weekDate: string }>();
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState<Date>(() => {
    if (weekDate) {
      try {
        const parsedDate = parse(weekDate, 'yyyy-MM-dd', new Date());
        if (isValid(parsedDate)) {
          return startOfWeek(parsedDate, { weekStartsOn: 0 });
        }
      } catch (error) {
        console.error("Error parsing weekDate:", error);
      }
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 });
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
    const formattedDate = format(currentWeek, 'yyyy-MM-dd');
    if (weekDate !== formattedDate) {
      console.log("Updating URL to match currentWeek:", formattedDate);
      navigate(`/schedule/${formattedDate}`, {
        replace: true
      });
    }
  }, [currentWeek, navigate, weekDate]);

  const fetchArrangements = async () => {
    const weekStartStr = format(currentWeek, 'yyyy-MM-dd');
    try {
      const { data, error } = await supabase
        .from('work_arrangements')
        .select('*')
        .eq('week_start', weekStartStr);
        
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
    console.log(`Navigating ${direction}...`);
    const newDate = direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1);
    console.log("New week date:", format(newDate, 'yyyy-MM-dd'));
    setCurrentWeek(newDate);
  };

  const weekStart = format(currentWeek, 'dd/MM/yyyy', { locale: he });
  const weekEnd = format(addDays(currentWeek, 6), 'dd/MM/yyyy', { locale: he });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8 schedule-page" dir="rtl">
      <ScheduleHeader weekStart={weekStart} weekEnd={weekEnd} />
      <WeekNavigation 
        weekStart={weekStart}
        weekEnd={weekEnd}
        onNavigateWeek={navigateWeek}
        onPrint={handlePrint}
      />

      <DesktopTabs 
        currentWeek={currentWeek}
        weekDate={weekDate}
        arrangements={arrangements}
      />
      
      <MobileTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        onPrint={handlePrint}
        currentWeek={currentWeek}
        weekDate={weekDate}
        arrangements={arrangements}
      />
    </div>
  );
};

export default SchedulePage;
