
import React, { useState, useEffect } from 'react';
import { format, addWeeks, startOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DigitalWorkArrangementEditor from '../schedule/DigitalWorkArrangementEditor';
import DigitalWorkArrangementView from '../schedule/DigitalWorkArrangementView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DigitalWorkArrangement = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [activeTab, setActiveTab] = useState<string>('view');
  const { toast } = useToast();

  // Function to navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentWeek(prevWeek => {
      const newWeek = new Date(prevWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      return startOfWeek(newWeek, { weekStartsOn: 0 });
    });
  };

  // Function to navigate to next week
  const goToNextWeek = () => {
    setCurrentWeek(prevWeek => {
      const newWeek = new Date(prevWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      return startOfWeek(newWeek, { weekStartsOn: 0 });
    });
  };

  // Function to format the week range for display
  const formatWeekRange = () => {
    const endOfWeek = new Date(currentWeek);
    endOfWeek.setDate(currentWeek.getDate() + 6); // Friday
    
    return `${format(currentWeek, 'dd')}-${format(endOfWeek, 'dd')} ב${format(currentWeek, 'MMMM yyyy')}`;
  };

  useEffect(() => {
    console.log("DigitalWorkArrangement component mounted");
    
    // Force a re-render after a short delay
    const timer = setTimeout(() => {
      console.log("DigitalWorkArrangement - forcing re-render");
      setCurrentWeek(current => {
        // This creates a new Date object with the same value, which will trigger a re-render
        return new Date(current.getTime());
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="overflow-hidden digital-work-arrangement">
      <CardHeader className="p-4 sm:p-6 space-y-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg sm:text-xl">לוח משמרות דיגיטל</CardTitle>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousWeek}
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              <span className="sr-only">שבוע קודם</span>
            </Button>
            
            <div className="text-sm font-medium">
              {formatWeekRange()}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextWeek}
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              <span className="sr-only">שבוע הבא</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="px-4 sm:px-6">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="view">צפייה</TabsTrigger>
              <TabsTrigger value="edit">עריכה</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="view" className="p-4 sm:p-6 pt-0">
            <DigitalWorkArrangementView 
              weekDate={format(currentWeek, 'yyyy-MM-dd')} 
            />
          </TabsContent>
          
          <TabsContent value="edit" className="pt-0">
            <div className="p-4 sm:p-6 pt-0">
              <DigitalWorkArrangementEditor 
                weekDate={format(currentWeek, 'yyyy-MM-dd')} 
                onSave={() => {
                  toast({ 
                    title: "לוח המשמרות נשמר בהצלחה",
                    description: "השינויים שביצעת בלוח המשמרות נשמרו בהצלחה"
                  });
                  setActiveTab('view');
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DigitalWorkArrangement;
