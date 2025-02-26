
import React, { useState } from 'react';
import ScheduleView from './ScheduleView';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleSlotDialog from './ScheduleSlotDialog';

const MasterSchedule = () => {
  const [showSlotDialog, setShowSlotDialog] = useState(false);

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
      />

      <ScheduleSlotDialog 
        isOpen={showSlotDialog} 
        onClose={() => setShowSlotDialog(false)}
        onSave={async (slotData) => {
          // Always set is_recurring to true for master schedule
          const updatedSlotData = {
            ...slotData,
            is_recurring: true
          };
          try {
            // Here we would call the save function from ScheduleView
            // For now, we'll close the dialog
            setShowSlotDialog(false);
          } catch (error) {
            console.error('Error saving slot:', error);
          }
        }}
        isMasterSchedule={true}
      />
    </div>
  );
};

export default MasterSchedule;
