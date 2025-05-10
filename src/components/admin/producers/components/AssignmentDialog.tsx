
import React, { useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { ScheduleSlot } from "@/types/schedule";
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import { useScroll } from '@/contexts/ScrollContext';

// Definition for role IDs
export const EDITING_ROLE_ID = '483bd320-9935-4184-bad7-43255fbe0691'; // עריכה
export const PRODUCTION_ROLE_ID = '348cf89d-0a9b-4c2c-bb33-8b2edee4c612'; // הפקה
export const EDITING_FIRST_ROLE_ID = 'new_role_id_1'; // עריכה ראשית
export const EVENING_PRODUCTION_ROLE_ID = 'new_role_id_2'; // הפקת ערב

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
  onOpenChange
}) => {
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const { saveScrollPosition, setIsScrollLocked } = useScroll();
  
  // Prevent default scroll behavior of dialog
  useEffect(() => {
    const handleBeforeDialogClose = () => {
      saveScrollPosition();
    };
    
    return () => {
      setIsScrollLocked(false);
    };
  }, [saveScrollPosition, setIsScrollLocked]);

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
            <div>
              <p className="font-medium">{getCombinedShowDisplay(currentSlot.show_name, currentSlot.host_name)}</p>
              <p className="text-sm text-muted-foreground">
                {dayNames[currentSlot.day_of_week]} {format(addDays(currentWeek, currentSlot.day_of_week), 'dd/MM/yyyy', { locale: he })}, {currentSlot.start_time}
              </p>
            </div>
            
            <div className="border rounded-md p-3 bg-slate-50">
              {/* Show only visible worker forms - initially 2 */}
              {producerForms.slice(0, visibleWorkerCount).map((form, index) => (
                <div key={`producer-form-${index}`} className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <Label htmlFor={`worker-${index}`} className="mb-2 block">עובד {index + 1}</Label>
                    <Select 
                      value={form.workerId} 
                      onValueChange={(value) => updateProducerForm(index, 'workerId', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="בחר עובד" />
                      </SelectTrigger>
                      <SelectContent>
                        {producers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name} 
                            {worker.position && (
                              <span className="text-gray-500 text-sm"> ({worker.position})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="text"
                      value={form.additionalText || ""}
                      onChange={(e) => updateProducerForm(index, 'additionalText', e.target.value)}
                      placeholder="הערות נוספות..."
                      className="w-full mt-2 p-2 border rounded text-sm"
                    />
                  </div>
                  <div className="pt-9">
                    <Select 
                      value={form.role} 
                      onValueChange={(value) => updateProducerForm(index, 'role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
              
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-4">אפשרויות נוספות:</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="permanent-toggle">משבץ קבוע (חל על כל השבועות)</Label>
                      <Switch 
                        id="permanent-toggle" 
                        checked={isPermanent}
                        onCheckedChange={(checked) => {
                          setIsPermanent(checked);
                          if (checked) toggleDay(-1); // Clear selected days when selecting permanent
                        }}
                      />
                    </div>
                  </div>
                  
                  {!isPermanent && (
                    <div>
                      <Label className="mb-2 block">הוסף לימים נוספים בשבוע זה:</Label>
                      <div className="flex flex-wrap gap-2">
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <Button
                            key={`day-toggle-${day}`}
                            type="button"
                            variant={selectedDays.includes(day) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDay(day)}
                            className={`${selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : ''}`}
                          >
                            {dayNames[day]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={handleCloseDialog}
              >
                ביטול
              </Button>
              <Button onClick={handleFormSubmit}>שמור</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDialog;
