
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PDFViewer from './PDFViewer';
import ScheduleView from './ScheduleView';
import ProducerAssignmentsView from './ProducerAssignmentsView';
import DigitalWorkArrangementView from './DigitalWorkArrangementView';

interface DesktopTabsProps {
  currentWeek: Date;
  weekDate?: string;
  arrangements: {
    producers: { url: string; filename: string } | null;
    engineers: { url: string; filename: string } | null;
    digital: { url: string; filename: string } | null;
  };
}

const DesktopTabs: React.FC<DesktopTabsProps> = ({
  currentWeek,
  weekDate,
  arrangements
}) => {
  return (
    <div className="hidden md:block">
      <Tabs defaultValue="schedule">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="schedule">לוח שידורים</TabsTrigger>
          <TabsTrigger value="producers">סידור הפקה</TabsTrigger>
          <TabsTrigger value="engineers">סידור טכנאים</TabsTrigger>
          <TabsTrigger value="digital">סידור דיגיטל</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule">
          <ScheduleView
            selectedDate={currentWeek}
            hideHeaderDates={true}
            hideDateControls={true}
          />
        </TabsContent>
        
        <TabsContent value="producers">
          {arrangements.producers ? (
            <PDFViewer
              url={arrangements.producers.url}
              filename={arrangements.producers.filename}
            />
          ) : (
            <ProducerAssignmentsView selectedDate={currentWeek} />
          )}
        </TabsContent>
        
        <TabsContent value="engineers">
          {arrangements.engineers ? (
            <PDFViewer
              url={arrangements.engineers.url}
              filename={arrangements.engineers.filename}
            />
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">סידור עבודה לא זמין</h3>
              <p className="text-muted-foreground">סידור עבודה לטכנאים לשבוע זה עדיין לא הועלה למערכת.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="digital">
          {arrangements.digital ? (
            <PDFViewer
              url={arrangements.digital.url}
              filename={arrangements.digital.filename}
            />
          ) : (
            <DigitalWorkArrangementView weekStart={currentWeek} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DesktopTabs;
