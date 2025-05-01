
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface DesktopTabsProps {
  currentWeek: Date;
  weekDate?: string;
  arrangements: Record<'producers' | 'engineers' | 'digital', ArrangementFile | null>;
}

export default function DesktopTabs({ currentWeek, weekDate, arrangements }: DesktopTabsProps) {
  return (
    <div className="hidden md:block">
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 schedTabs" dir="rtl">
          <TabsTrigger value="schedule" className="font-extrabold bg-slate-300 hover:bg-slate-200 mx-[15px]">לוח שידורים</TabsTrigger>
          <TabsTrigger value="producers" className="font-extrabold bg-blue-200 hover:bg-blue-100 mx-[15px]">סידור עבודה עורכים ומפיקים</TabsTrigger>
          <TabsTrigger value="engineers" className="bg-slate-300 hover:bg-slate-200 text-sm font-extrabold mx-[15px]">סידור עבודה טכנאים</TabsTrigger>
          <TabsTrigger value="digital" className="bg-green-200 hover:bg-green-100 text-sm font-extrabold mx-[15px]">סידור עבודה דיגיטל</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="mt-4 schedule-content">
          <div className="border rounded-lg overflow-hidden bg-white p-4">
            <ScheduleView 
              selectedDate={currentWeek} 
              hideDateControls 
              hideHeaderDates={false}
              filterShowsByWeek={true}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="producers" className="mt-4">
          <PdfViewer url={arrangements.producers?.url || null} />
        </TabsContent>
        
        <TabsContent value="engineers" className="mt-4">
          <PdfViewer url={arrangements.engineers?.url || null} />
        </TabsContent>
        
        <TabsContent value="digital" className="mt-4">
          <DigitalWorkArrangementView weekDate={weekDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
