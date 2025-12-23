import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer, Calendar, Users, Wrench, Monitor } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ScheduleView from './ScheduleView';
import ProducerAssignmentsView from './ProducerAssignmentsView';
import EngineerAssignmentsView from './EngineerAssignmentsView';
import DigitalWorkArrangementView from './DigitalWorkArrangementView';

interface MobileTabsProps {
  selectedTab: string;
  onSelectTab: (value: string) => void;
  onPrint: () => void;
  currentWeek: Date;
  weekDate?: string;
  arrangements: {
    producers: { url: string; filename: string } | null;
    engineers: { url: string; filename: string } | null;
    digital: { url: string; filename: string } | null;
  };
  isAdmin: boolean;
}

const MobileTabs: React.FC<MobileTabsProps> = ({
  selectedTab,
  onSelectTab,
  onPrint,
  currentWeek,
  weekDate,
  arrangements,
  isAdmin
}) => {
  return (
    <div className="md:hidden space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-2">
        <Tabs value={selectedTab} onValueChange={onSelectTab} className="flex-grow">
          <TabsList className="grid grid-cols-4 w-full bg-slate-100/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200/50 shadow-inner h-14">
            <TabsTrigger
              value="schedule"
              className="text-[10px] h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
            >
              <Calendar className="h-4 w-4" />
              <span>לוח</span>
            </TabsTrigger>
            <TabsTrigger
              value="producers"
              className="text-[10px] h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
            >
              <Users className="h-4 w-4" />
              <span>הפקה</span>
            </TabsTrigger>
            <TabsTrigger
              value="engineers"
              className="text-[10px] h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
            >
              <Wrench className="h-4 w-4" />
              <span>טכני</span>
            </TabsTrigger>
            <TabsTrigger
              value="digital"
              className="text-[10px] h-11 flex flex-col items-center justify-center gap-0.5 rounded-xl font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
            >
              <Monitor className="h-4 w-4" />
              <span>דיגיטל</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="default"
          size="icon"
          onClick={onPrint}
          className="h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200 shrink-0"
        >
          <Printer className="h-5 w-5" />
        </Button>
      </div>

      {selectedTab === 'schedule' && (
        <ScheduleView
          selectedDate={new Date()}
          hideHeaderDates={false}
          hideDateControls={true}
          isAdmin={isAdmin}
          showAddButton={true}
        />
      )}

      {selectedTab === 'producers' && (
        <ProducerAssignmentsView selectedDate={currentWeek} />
      )}

      {selectedTab === 'engineers' && (
        arrangements.engineers ? (
          <PDFViewer
            url={arrangements.engineers.url}
            filename={arrangements.engineers.filename}
          />
        ) : (
          <EngineerAssignmentsView selectedDate={currentWeek} />
        )
      )}

      {selectedTab === 'digital' && (
        <DigitalWorkArrangementView selectedDate={currentWeek} />
      )}
    </div>
  );
};

export default MobileTabs;
