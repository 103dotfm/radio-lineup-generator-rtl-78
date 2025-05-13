
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduleSlot } from '@/types/schedule';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { ProducerFormItem } from '../hooks/useProducerForms';
import ProducerFormField from './dialog/ProducerFormField';

// Export these values to be used in other components
export const EDITING_ROLE_ID = "7b6dc30f-58cf-4f30-b387-7353dd324362";
export const PRODUCTION_ROLE_ID = "adfd67f8-f731-459e-8478-db5363b06549";
export const EDITING_FIRST_ROLE_ID = "88232bd9-f9f1-4ae2-b7ea-c60248c3e4d3";
export const EVENING_PRODUCTION_ROLE_ID = "fd4e1e3d-0d87-4322-a25e-fec33765d949";

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
  setIsPermanent: (value: boolean) => void;
  handleSubmit: () => void;
  handleCloseDialog: () => void;
  producers: any[];
  roles: any[];
  currentWeek: Date;
  isSubmitting: boolean;
}

const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
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
}) => {
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const weekStartFormatted = format(currentWeek, 'dd/MM/yyyy', { locale: he });
  
  // Sort roles by display_order if available
  const sortedRoles = [...roles].sort((a, b) => {
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    // Fallback to name comparison if display_order is not available
    return a.name.localeCompare(b.name);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {currentSlot ? getCombinedShowDisplay(currentSlot.show_name, currentSlot.host_name) : 'הוסף שיבוץ'}
          </DialogTitle>
          <div className="text-muted-foreground text-sm text-right">
            {currentSlot && (
              <>
                {dayNames[currentSlot.day_of_week]} {currentSlot.start_time.substring(0, 5)}-{currentSlot.end_time.substring(0, 5)}
              </>
            )}
            <div>שבוע {weekStartFormatted}</div>
          </div>
        </DialogHeader>

        {/* Worker Forms */}
        <div className="space-y-3 mt-5">
          {Array.from({ length: visibleWorkerCount }).map((_, index) => (
            <ProducerFormField
              key={`producer-form-${index}`}
              index={index}
              workerId={producerForms[index]?.workerId || ""}
              role={producerForms[index]?.role || ""}
              additionalText={producerForms[index]?.additionalText}
              updateForm={updateProducerForm}
              producers={producers}
              roles={sortedRoles}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={addWorkerForm}
          >
            + הוסף עובד נוסף
          </Button>
        </div>

        {/* Assignment Options */}
        <div className="space-y-4 border-t pt-4">
          {/* Days multi-select */}
          <div>
            <Label className="mb-2 block">שכפל לימים נוספים באותו שבוע</Label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((day, index) => (
                <div
                  key={`day-${index}`}
                  className={`px-3 py-1.5 border rounded cursor-pointer ${
                    selectedDays.includes(index) ? "bg-primary text-primary-foreground" : "bg-background"
                  }`}
                  onClick={() => toggleDay(index)}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {/* Permanent checkbox */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="permanent"
              checked={isPermanent}
              onCheckedChange={(checked) => setIsPermanent(checked as boolean)}
            />
            <Label htmlFor="permanent">קבוע (החל משבוע זה)</Label>
          </div>
        </div>

        <DialogFooter className="justify-start">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCloseDialog}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'שומר...' : 'שמור'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDialog;
