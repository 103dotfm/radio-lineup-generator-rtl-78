import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Wrench, Monitor } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ScheduleView from './ScheduleView';
import ProducerAssignmentsView from './ProducerAssignmentsView';
import EngineerAssignmentsView from './EngineerAssignmentsView';
import DigitalWorkArrangementView from './DigitalWorkArrangementView';

interface DesktopTabsProps {
  currentWeek: Date;
  weekDate?: string;
  arrangements: {
    producers: { url: string; filename: string } | null;
    engineers: { url: string; filename: string } | null;
    digital: { url: string; filename: string } | null;
  };
  isAdmin: boolean;
}

const DesktopTabs: React.FC<DesktopTabsProps> = ({
  currentWeek,
  weekDate,
  arrangements,
  isAdmin
}) => {
  return (
    <div className="hidden md:block mt-8 animate-in fade-in duration-1000">
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="flex items-center justify-start gap-2 bg-slate-100/50 p-2 rounded-[2rem] backdrop-blur-sm border border-slate-200/50 shadow-inner w-fit mb-8">
          <TabsTrigger
            value="schedule"
            className="flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
          >
            <Calendar className="h-5 w-5" />
            לוח שידורים
          </TabsTrigger>
          <TabsTrigger
            value="producers"
            className="flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
          >
            <Users className="h-5 w-5" />
            סידור הפקה
          </TabsTrigger>
          <TabsTrigger
            value="engineers"
            className="flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
          >
            <Wrench className="h-5 w-5" />
            סידור טכנאים
          </TabsTrigger>
          <TabsTrigger
            value="digital"
            className="flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
          >
            <Monitor className="h-5 w-5" />
            סידור דיגיטל
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleView
            selectedDate={currentWeek}
            hideHeaderDates={false}
            hideDateControls={true}
            isAdmin={isAdmin}
            showAddButton={true}
          />
        </TabsContent>

        <TabsContent value="producers">
          <ProducerAssignmentsView selectedDate={currentWeek} />
        </TabsContent>

        <TabsContent value="engineers">
          {arrangements.engineers ? (
            <PDFViewer
              url={arrangements.engineers.url}
              filename={arrangements.engineers.filename}
            />
          ) : (
            <EngineerAssignmentsView selectedDate={currentWeek} />
          )}
        </TabsContent>

        <TabsContent value="digital">
          <DigitalWorkArrangementView selectedDate={currentWeek} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DesktopTabs;
