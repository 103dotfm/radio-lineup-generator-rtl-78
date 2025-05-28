import React, { useState } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ScheduleSlotDialog from '@/components/schedule/dialogs/ScheduleSlotDialog';
import { useQueryClient } from '@tanstack/react-query';
import { createScheduleSlot, updateScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';

const ScheduleSection = ({ isAdmin }: { isAdmin: boolean }) => {
  const [currentDate, setCurrentDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = direction === 'prev' ? subWeeks(prevDate, 1) : addWeeks(prevDate, 1);
      console.log(`Dashboard schedule navigating to ${direction} week:`, newDate);
      return newDate;
    });
  };

  const handleSaveSlot = async (slotData: any) => {
    console.log('Attempting to save weekly schedule slot:', slotData);
    console.log('Using currentDate for slot creation:', currentDate);
    try {
      // Check if this is an update or a new slot
      if (slotData.id) {
        console.log("Updating existing weekly slot:", slotData.id);
        const {
          id,
          ...updates
        } = slotData;
        await updateScheduleSlot(id, updates, false, currentDate); // Pass currentDate as selectedDate
        console.log('Weekly schedule slot updated successfully');
      } else {
        console.log("Creating new weekly slot for date:", currentDate);
        await createScheduleSlot(slotData, false, currentDate); // Pass currentDate as selectedDate
        console.log('Weekly schedule slot created successfully');
      }

      // Force refresh the schedule view
      await queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      console.log('Query cache invalidated');
      toast({
        title: slotData.id ? "משבצת שידור עודכנה בהצלחה" : "משבצת שידור נוספה בהצלחה"
      });
      setShowSlotDialog(false);
    } catch (error) {
      console.error('Error saving weekly schedule slot:', error);
      toast({
        title: slotData.id ? "שגיאה בעדכון משבצת שידור" : "שגיאה בהוספת משבצת שידור",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">לוח שידורים שבועי</h2>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          {isAdmin && (
            <Button 
              onClick={() => setShowSlotDialog(true)} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              הוסף משבצת שידור
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigateWeek('prev')}
          >
            <ChevronRight className="h-4 w-4 ml-1" />
            שבוע קודם
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigateWeek('next')}
          >
            שבוע הבא
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </div>
      
      <ScheduleView 
        selectedDate={currentDate} 
        isAdmin={isAdmin}
        hideDateControls={true} 
      />

      <ScheduleSlotDialog 
        isOpen={showSlotDialog} 
        onClose={() => setShowSlotDialog(false)} 
        onSave={handleSaveSlot}
        isMasterSchedule={false}
      />
    </div>
  );
};

export default ScheduleSection;
