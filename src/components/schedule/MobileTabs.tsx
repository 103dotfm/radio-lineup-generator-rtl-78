
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Printer } from 'lucide-react';
import PDFViewer from './PDFViewer';
import ScheduleView from './ScheduleView';
import ProducerAssignmentsView from './ProducerAssignmentsView';
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
}

const MobileTabs: React.FC<MobileTabsProps> = ({
  selectedTab,
  onSelectTab,
  onPrint,
  currentWeek,
  weekDate,
  arrangements
}) => {
  return (
    <div className="md:hidden space-y-4">
      <div className="flex justify-between items-center">
        <Tabs value={selectedTab} onValueChange={onSelectTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="schedule" className="text-xs py-1 px-1">לוח</TabsTrigger>
            <TabsTrigger value="producers" className="text-xs py-1 px-1">הפקה</TabsTrigger>
            <TabsTrigger value="engineers" className="text-xs py-1 px-1">טכני</TabsTrigger>
            <TabsTrigger value="digital" className="text-xs py-1 px-1">דיגיטל</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={onPrint} className="ml-2">
          <Printer className="h-4 w-4" />
        </Button>
      </div>

      {selectedTab === 'schedule' && (
        <ScheduleView
          selectedDate={currentWeek}
          hideHeaderDates={true}
          hideDateControls={true}
        />
      )}
      
      {selectedTab === 'producers' && (
        arrangements.producers ? (
          <PDFViewer
            url={arrangements.producers.url}
            filename={arrangements.producers.filename}
          />
        ) : (
          <ProducerAssignmentsView selectedDate={currentWeek} />
        )
      )}
      
      {selectedTab === 'engineers' && (
        arrangements.engineers ? (
          <PDFViewer
            url={arrangements.engineers.url}
            filename={arrangements.engineers.filename}
          />
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">סידור עבודה לא זמין</h3>
            <p className="text-muted-foreground text-sm">סידור עבודה לטכנאים לשבוע זה עדיין לא הועלה למערכת.</p>
          </div>
        )
      )}
      
      {selectedTab === 'digital' && (
        arrangements.digital ? (
          <PDFViewer
            url={arrangements.digital.url}
            filename={arrangements.digital.filename}
          />
        ) : (
          <DigitalWorkArrangementView weekStart={currentWeek} />
        )
      )}
    </div>
  );
};

export default MobileTabs;
