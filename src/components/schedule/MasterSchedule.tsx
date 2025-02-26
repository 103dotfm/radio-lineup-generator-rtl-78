
import React, { useState } from 'react';
import ScheduleView from './ScheduleView';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleSlotDialog from './ScheduleSlotDialog';
import { useQueryClient } from '@tanstack/react-query';
import { createScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';

const MasterSchedule = () => {
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-4">
      <div className="bg-yellow-100 p-4 rounded-lg">
        <h2 className="text-lg font-bold mb-2">לוח שידורים ראשי</h2>
        <p>זהו לוח השידורים הקבוע של התחנה. שינויים שנעשים כאן ישפיעו על כל השבועות העתידיות.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowSlotDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          הוסף משבצת שידור
        </Button>
      </div>

      <ScheduleView 
        isAdmin 
        isMasterSchedule 
        hideDateControls 
        showAddButton={false}
        hideHeaderDates
      />

      <ScheduleSlotDialog 
        isOpen={showSlotDialog} 
        onClose={() => setShowSlotDialog(false)}
        onSave={async (slotData) => {
          const updatedSlotData = {
            ...slotData,
            is_recurring: true
          };
          
          try {
            await createScheduleSlot(updatedSlotData);
            queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
            toast({
              title: "משבצת שידור נוספה בהצלחה"
            });
            setShowSlotDialog(false);
          } catch (error) {
            console.error('Error saving slot:', error);
            toast({
              title: "שגיאה בהוספת משבצת שידור",
              variant: "destructive"
            });
          }
        }}
        isMasterSchedule={true}
      />
    </div>
  );
};

export default MasterSchedule;
