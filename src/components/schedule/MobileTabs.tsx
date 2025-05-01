
import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduleView } from '@/components/schedule/ScheduleView';
import PdfViewer from './PdfViewer';
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';

interface ArrangementFile {
  id: string;
  filename: string;
  url: string;
  type: 'producers' | 'engineers' | 'digital';
  week_start: string;
}

interface MobileTabsProps {
  selectedTab: string;
  onSelectTab: (value: string) => void;
  onPrint: () => void;
  currentWeek: Date;
  weekDate?: string;
  arrangements: Record<'producers' | 'engineers' | 'digital', ArrangementFile | null>;
}

export default function MobileTabs({
  selectedTab,
  onSelectTab,
  onPrint,
  currentWeek,
  weekDate,
  arrangements
}: MobileTabsProps) {
  return (
    <div className="block md:hidden">
      <div className="mb-4">
        <Select value={selectedTab} onValueChange={onSelectTab}>
          <SelectTrigger className="w-full bg-white text-right">
            <SelectValue placeholder="בחר תצוגה" className="text-right" />
          </SelectTrigger>
          <SelectContent dir="rtl" className="bg-white">
            <SelectItem value="schedule">לוח שידורים</SelectItem>
            <SelectItem value="producers">סידור עבודה עורכים ומפיקים</SelectItem>
            <SelectItem value="engineers">סידור עבודה טכנאים</SelectItem>
            <SelectItem value="digital">סידור עבודה דיגיטל</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPrint} 
          className="flex md:hidden items-center"
        >
          <Printer className="h-4 w-4 ml-1" />
          הדפסת הלוח
        </Button>
      </div>
      
      <div className="mt-4">
        {selectedTab === "schedule" && (
          <div className="border rounded-lg overflow-hidden bg-white p-2 schedule-content">
            <ScheduleView 
              selectedDate={currentWeek} 
              hideDateControls 
              hideHeaderDates={false}
              filterShowsByWeek={true}
            />
          </div>
        )}
        
        {selectedTab === "producers" && <PdfViewer url={arrangements.producers?.url || null} />}
        
        {selectedTab === "engineers" && <PdfViewer url={arrangements.engineers?.url || null} />}
        
        {selectedTab === "digital" && <DigitalWorkArrangementView weekDate={weekDate} />}
      </div>
    </div>
  );
}
