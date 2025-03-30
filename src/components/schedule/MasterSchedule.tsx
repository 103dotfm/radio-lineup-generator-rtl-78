
import React, { useState } from 'react';
import ScheduleView from './ScheduleView';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleSlotDialog from './dialogs/ScheduleSlotDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek } from 'date-fns';

const MasterSchedule = () => {
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return <div className="space-y-4">
      <div className="p-4 rounded-lg bg-transparent">
        <h2 className="text-lg font-bold mb-2 text-right">לוח שידורים ראשי</h2>
        <p className="text-right">.זהו לוח השידורים הקבוע של התחנה. שינויים שנעשים כאן ישפיעו על כל השבועות העתידיים</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowSlotDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          הוסף משבצת שידור
        </Button>
      </div>

      <ScheduleView isAdmin isMasterSchedule hideDateControls showAddButton={false} hideHeaderDates />

      <ScheduleSlotDialog 
        isOpen={showSlotDialog} 
        onClose={() => setShowSlotDialog(false)} 
        onSave={async slotData => {
          console.log('Attempting to save master schedule slot:', slotData);
          try {
            // Ensure we're working with the master schedule
            const today = new Date();
            const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
            slotData.date = format(currentWeekStart, 'yyyy-MM-dd'); 
            slotData.is_recurring = true;
            
            // Clear the query cache completely to force a refetch
            await queryClient.removeQueries({
              queryKey: ['scheduleSlots']
            });
            
            // Force a refetch after a short delay
            setTimeout(() => {
              queryClient.invalidateQueries({
                queryKey: ['scheduleSlots']
              });
            }, 500);
            
            toast({
              title: slotData.id ? "משבצת שידור עודכנה בהצלחה" : "משבצת שידור נוספה בהצלחה"
            });
            setShowSlotDialog(false);
          } catch (error) {
            console.error('Error saving master schedule slot:', error);
            toast({
              title: slotData.id ? "שגיאה בעדכון משבצת שידור" : "שגיאה בהוספת משבצת שידור",
              variant: "destructive"
            });
          }
        }} 
        isMasterSchedule={true} 
      />
    </div>;
};

export default MasterSchedule;
