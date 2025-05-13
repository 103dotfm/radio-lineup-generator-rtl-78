
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AssignmentOptions from './dialog/AssignmentOptions';
import ProducerFormField from './dialog/ProducerFormField';
import SlotInfo from './dialog/SlotInfo';
import { ScheduleSlot } from '@/types/schedule';
import { ProducerFormItem } from '../hooks/useProducerForms';

export const EDITING_ROLE_ID = "f3e35b3a-5957-4632-a646-ea39bfbd25e1";
export const PRODUCTION_ROLE_ID = "a90d1edf-718a-4577-9ce7-e83a9c843d17";
export const EDITING_FIRST_ROLE_ID = "a3acd83c-58e8-4b9c-a195-1442e1b5e54a";
export const EVENING_PRODUCTION_ROLE_ID = "c1db7685-0ccc-44ab-a673-f528aeec3b92";

interface AssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlot: ScheduleSlot | null;
  producerForms: ProducerFormItem[];
  updateProducerForm: (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => void;
  visibleWorkerCount: number;
  addWorkerForm: () => void;
  selectedDays: number[];
  toggleDay: (day: number) => void;
  isPermanent: boolean;
  setIsPermanent: (isPermanent: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleCloseDialog: () => void;
  producers: any[];
  roles: any[];
  currentWeek: Date;
  isSubmitting: boolean;
}

const AssignmentDialog = ({
  isOpen,
  onOpenChange,
  currentSlot,
  producerForms,
  updateProducerForm,
  visibleWorkerCount,
  addWorkerForm,
  selectedDays,
  toggleDay,
  isPermanent,
  setIsPermanent,
  handleSubmit,
  handleCloseDialog,
  producers,
  roles,
  currentWeek,
  isSubmitting
}: AssignmentDialogProps) => {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" 
        onEscapeKeyDown={handleCloseDialog}
        onInteractOutside={handleCloseDialog}
      >
        <DialogHeader>
          <DialogTitle>שיבוץ מפיקים לתוכנית</DialogTitle>
          <DialogDescription>
            {currentSlot?.show_name} - {currentSlot?.start_time}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Slot info section */}
          <SlotInfo currentSlot={currentSlot!} currentWeek={currentWeek} />
          
          {/* Producer forms section */}
          <div className="space-y-4">
            {Array.from({ length: visibleWorkerCount }).map((_, index) => (
              <ProducerFormField
                key={`producer-form-${index}`}
                index={index}
                producerForm={producerForms[index]}
                updateProducerForm={updateProducerForm}
                producers={producers}
                roles={roles}
                // Explicitly pass default role IDs based on position
                defaultRole={index === 0 ? EDITING_ROLE_ID : 
                            (index === 1 ? PRODUCTION_ROLE_ID : 
                             (index === 2 ? EDITING_FIRST_ROLE_ID : 
                              (index === 3 ? EVENING_PRODUCTION_ROLE_ID : EDITING_ROLE_ID)))}
              />
            ))}
            
            {visibleWorkerCount < 6 && (
              <Button type="button" variant="outline" onClick={addWorkerForm} className="w-full">
                הוספת מפיק נוסף
              </Button>
            )}
          </div>
          
          {/* Assignment options section */}
          <AssignmentOptions
            isPermanent={isPermanent}
            setIsPermanent={setIsPermanent}
            selectedDays={selectedDays}
            toggleDay={toggleDay}
            currentSlot={currentSlot!}
          />
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={handleCloseDialog}>
            ביטול
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className={isSubmitting ? "opacity-70" : ""}
          >
            {isSubmitting ? "מבצע שיבוץ..." : "שיבוץ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDialog;
