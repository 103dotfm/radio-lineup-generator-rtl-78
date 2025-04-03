
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO, isValid } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DigitalWorkArrangementView from '@/components/schedule/DigitalWorkArrangementView';

const SchedulePage = () => {
  const { weekDate } = useParams<{ weekDate: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string>("schedule");
  const { isAdmin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (weekDate) {
      try {
        const parsedDate = parseISO(weekDate);
        if (isValid(parsedDate)) {
          setSelectedDate(parsedDate);
        } else {
          // Handle invalid date
          setSelectedDate(new Date());
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        setSelectedDate(new Date());
      }
    } else {
      setSelectedDate(new Date());
    }
  }, [weekDate]);

  if (!selectedDate) {
    return <div className="flex items-center justify-center h-screen">טוען...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">לוח שידורים</h1>
        {isAuthenticated && (
          <Button
            variant="outline"
            asChild
            className="flex items-center gap-2"
          >
            <Link to="/">
              <ArrowRight className="h-4 w-4" />
              חזרה ללוח הבקרה
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="schedule" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="schedule">לוח שידורים</TabsTrigger>
          <TabsTrigger value="digital">סידור עבודה דיגיטל</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <ScheduleView 
            selectedDate={selectedDate}
            isAdmin={isAdmin} 
            hideDateControls={false}
            showAddButton={isAdmin}
          />
        </TabsContent>
        
        <TabsContent value="digital" className="space-y-4">
          <DigitalWorkArrangementView
            weekDate={format(selectedDate, 'yyyy-MM-dd')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SchedulePage;
