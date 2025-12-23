import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parse, startOfWeek, addDays, addWeeks, subWeeks, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { api } from "@/lib/api-client";
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  const { isAdmin } = useAuth();
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
  const [isLoadingArrangements, setIsLoadingArrangements] = useState(false);
  const [arrangementsError, setArrangementsError] = useState<string | null>(null);

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
    console.log(`Fetching arrangements for week: ${weekStartStr}`);
    setIsLoadingArrangements(true);
    setArrangementsError(null);
    
    try {
      // Ensure weekStart is in full ISO format with time if required by server
      const weekStartISO = `${weekStartStr}T00:00:00.000Z`;
      const { data, error } = await api.query('work-arrangements', {
        where: JSON.stringify({
          week_start: weekStartISO
        }),
        order: JSON.stringify({ created_at: 'desc' })
      });
        
      if (error) {
        console.error('Error fetching arrangements:', error);
        setArrangementsError(`שגיאה בטעינת סידורי העבודה: ${error.message}`);
        return;
      }
      
      const arrangementsRecord: Record<ArrangementType, ArrangementFile | null> = {
        producers: null,
        engineers: null,
        digital: null
      };
      
      if (data && data.length > 0) {
        console.log('Found arrangements:', data);
        data.forEach(item => {
          const arrangementItem = item as unknown as ArrangementFile;
          if (arrangementItem.type === 'producers' || arrangementItem.type === 'engineers' || arrangementItem.type === 'digital') {
            // Take the first (latest by created_at desc) per type
            if (!arrangementsRecord[arrangementItem.type]) {
              arrangementsRecord[arrangementItem.type] = arrangementItem;
              console.log(`Set latest ${arrangementItem.type} arrangement:`, arrangementItem);
            }
          }
        });
      } else {
        console.log('No arrangements found for week:', weekStartStr);
      }
      
      console.log('Final arrangements record:', arrangementsRecord);
      setArrangements(arrangementsRecord);
    } catch (error) {
      console.error('Error in fetchArrangements:', error);
      setArrangementsError('שגיאה בטעינת סידורי העבודה');
    } finally {
      setIsLoadingArrangements(false);
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
        isAdmin={isAdmin}
      />
      
      <MobileTabs
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        onPrint={handlePrint}
        currentWeek={currentWeek}
        weekDate={weekDate}
        arrangements={arrangements}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default SchedulePage;
