
import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { ScheduleSlot } from "@/types/schedule";
import { useScroll } from '@/contexts/ScrollContext';
import SlotInfo from './dialog/SlotInfo';
import ProducerFormField from './dialog/ProducerFormField';
import AssignmentOptions from './dialog/AssignmentOptions';

// Definition for role IDs
export const EDITING_ROLE_ID = '483bd320-9935-4184-bad7-43255fbe0691'; // עריכה
export const PRODUCTION_ROLE_ID = '348cf89d-0a9b-4c2c-bb33-8b2edee4c612'; // הפקה
export const EDITING_FIRST_ROLE_ID = 'c8fb5c44-280a-4b1d-8a8b-8c3f3c1d2e4f'; // עריכה ראשית
export const EVENING_PRODUCTION_ROLE_ID = 'a7d65e32-91b3-4c09-8f5a-1e2d3f4b5c6d'; // הפקת ערב

interface ProducerFormItem {
  workerId: string;
  role: string;
  additionalText?: string;
}

interface AssignmentDialogProps {
  isOpen: boolean;
  currentSlot: ScheduleSlot | null;
  producerForms: ProducerFormItem[];
  updateProducerForm: (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => void;
  visibleWorkerCount: number;
  addWorkerForm: () => void;
  selectedDays: number[];
  toggleDay: (dayId: number) => void;
  isPermanent: boolean;
  setIsPermanent: (value: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleCloseDialog: () => void;
  producers: any[];
  roles: any[];
  currentWeek: Date;
  onOpenChange: (isOpen: boolean) => void;
  isSubmitting?: boolean;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  isOpen,
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
  onOpenChange,
  isSubmitting = false
}) => {
  const { saveScrollPosition } = useScroll();
  
  const handleFormSubmit = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    saveScrollPosition();
    await handleSubmit();
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        saveScrollPosition();
        
        if (open === false) {
          // If closing, call handleCloseDialog
          handleCloseDialog();
        } else {
          // If opening, call parent's onOpenChange
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>הוספת עובדים לתוכנית</DialogTitle>
          <DialogDescription>
            שבץ עובדים לתפקידים שונים בתוכנית
          </DialogDescription>
        </DialogHeader>
        
        {currentSlot && (
          <div className="space-y-6 py-4">
            <SlotInfo currentSlot={currentSlot} currentWeek={currentWeek} />
            
            <div className="border rounded-md p-3 bg-slate-50">
              {/* Show only visible worker forms */}
              {producerForms.slice(0, visibleWorkerCount).map((form, index) => (
                <ProducerFormField
                  key={`producer-form-${index}`}
                  form={{}} // Removed dependency on react-hook-form
                  index={index}
                  name="producerForms"
                  label="תפקיד"
                  placeholder="בחר תפקיד"
                />
              ))}

              {/* Button to add more workers */}
              {visibleWorkerCount < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={addWorkerForm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  הוסף עובד נוסף
                </Button>
              )}
              
              <AssignmentOptions
                isPermanent={isPermanent}
                setIsPermanent={setIsPermanent}
                selectedDays={selectedDays}
                toggleDay={toggleDay}
              />
            </div>
            
            <DialogFooter className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={handleCloseDialog}
              >
                ביטול
              </Button>
              <Button 
                onClick={handleFormSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'שומר...' : 'שמור'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDialog;
