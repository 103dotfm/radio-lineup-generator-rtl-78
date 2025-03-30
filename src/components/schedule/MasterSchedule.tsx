import React, { useState } from 'react';
import ScheduleView from './ScheduleView';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleSlotDialog from './dialogs/ScheduleSlotDialog';
import { useQueryClient } from '@tanstack/react-query';
import { createScheduleSlot, updateScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/types/schedule';
const MasterSchedule = () => {
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const {
    toast
  } = useToast();
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

      <ScheduleSlotDialog isOpen={showSlotDialog} onClose={() => setShowSlotDialog(false)} onSave={async slotData => {
      console.log('Attempting to save master schedule slot:', slotData);
      try {
        // Check if this is an update or a new slot
        if (slotData.id) {
          console.log("Updating existing master slot:", slotData.id);
          const {
            id,
            ...updates
          } = slotData;
          await updateScheduleSlot(id, updates, true);
          console.log('Master schedule slot updated successfully');
        } else {
          console.log("Creating new master slot");
          await createScheduleSlot(slotData, true);
          console.log('Master schedule slot created successfully');
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
        console.error('Error saving master schedule slot:', error);
        toast({
          title: slotData.id ? "שגיאה בעדכון משבצת שידור" : "שגיאה בהוספת משבצת שידור",
          variant: "destructive"
        });
      }
    }} isMasterSchedule={true} />
    </div>;
};
export default MasterSchedule;