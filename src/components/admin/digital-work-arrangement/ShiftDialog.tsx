
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkerSelector } from '@/components/schedule/workers/WorkerSelector';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { SECTION_TITLES, SHIFT_TYPE_LABELS, DAYS_OF_WEEK, DEFAULT_SHIFT_TIMES, Shift, ShiftData } from './types';
import { useArrangement } from './ArrangementContext';

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShift: Shift | null;
  onSuccess: () => void;
}

const ShiftDialog: React.FC<ShiftDialogProps> = ({ 
  open, 
  onOpenChange, 
  editingShift, 
  onSuccess 
}) => {
  const { arrangement, currentSection } = useArrangement();
  const { toast } = useToast();
  const [newShiftData, setNewShiftData] = React.useState<ShiftData>({
    section_name: currentSection,
    day_of_week: 0,
    shift_type: 'morning',
    start_time: DEFAULT_SHIFT_TIMES.morning.start,
    end_time: DEFAULT_SHIFT_TIMES.morning.end,
    person_name: '',
    additional_text: '',
    is_custom_time: false,
    is_hidden: false
  });

  React.useEffect(() => {
    if (editingShift) {
      setNewShiftData({
        section_name: editingShift.section_name,
        day_of_week: editingShift.day_of_week,
        shift_type: editingShift.shift_type,
        start_time: editingShift.start_time,
        end_time: editingShift.end_time,
        person_name: editingShift.person_name || '',
        additional_text: editingShift.additional_text || '',
        is_custom_time: editingShift.is_custom_time,
        is_hidden: editingShift.is_hidden
      });
    } else {
      setNewShiftData({
        section_name: currentSection,
        day_of_week: 0,
        shift_type: 'morning',
        start_time: DEFAULT_SHIFT_TIMES.morning.start,
        end_time: DEFAULT_SHIFT_TIMES.morning.end,
        person_name: '',
        additional_text: '',
        is_custom_time: false,
        is_hidden: false
      });
    }
  }, [editingShift, currentSection, open]);

  const handleSaveShift = async () => {
    if (!arrangement) return;
    
    try {
      if (editingShift) {
        const { error } = await supabase
          .from('digital_shifts')
          .update({
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden
          })
          .eq('id', editingShift.id);
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "המשמרת עודכנה בהצלחה"
        });
      } else {
        // Get position for the new shift
        const { data: existingShifts } = await supabase
          .from('digital_shifts')
          .select('*')
          .eq('arrangement_id', arrangement.id)
          .eq('section_name', newShiftData.section_name)
          .eq('day_of_week', newShiftData.day_of_week)
          .eq('shift_type', newShiftData.shift_type);
          
        const position = existingShifts ? existingShifts.length : 0;
        
        const { error } = await supabase
          .from('digital_shifts')
          .insert({
            arrangement_id: arrangement.id,
            section_name: newShiftData.section_name,
            day_of_week: newShiftData.day_of_week,
            shift_type: newShiftData.shift_type,
            start_time: newShiftData.start_time,
            end_time: newShiftData.end_time,
            person_name: newShiftData.person_name || null,
            additional_text: newShiftData.additional_text || null,
            is_custom_time: newShiftData.is_custom_time,
            is_hidden: newShiftData.is_hidden,
            position: position
          });
        
        if (error) throw error;
        
        toast({
          title: "בוצע",
          description: "המשמרת נוצרה בהצלחה"
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving shift:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את המשמרת",
        variant: "destructive"
      });
    }
  };

  const closeDialog = () => {
    document.body.style.pointerEvents = '';
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
        }
        onOpenChange(open);
      }}
    >
      <DialogContent 
        className="sm:max-w-[425px] bg-background" 
        onEscapeKeyDown={closeDialog}
        onPointerDownOutside={closeDialog}
        onInteractOutside={(e) => {
          e.preventDefault();
          closeDialog();
        }}
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>
            {editingShift ? 'עריכת משמרת' : 'הוספת משמרת חדשה'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="shift-section">סקשן</Label>
            <Select
              value={newShiftData.section_name}
              onValueChange={(value) => setNewShiftData({...newShiftData, section_name: value})}
            >
              <SelectTrigger className="col-span-3 bg-background">
                <SelectValue placeholder="בחר סקשן" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {Object.entries(SECTION_TITLES).map(([key, title]) => (
                  <SelectItem key={key} value={key}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="shift-day">יום</Label>
            <Select
              value={newShiftData.day_of_week.toString()}
              onValueChange={(value) => setNewShiftData({...newShiftData, day_of_week: parseInt(value)})}
            >
              <SelectTrigger className="col-span-3 bg-background">
                <SelectValue placeholder="בחר יום" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {DAYS_OF_WEEK.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="shift-type">סוג משמרת</Label>
            <Select
              value={newShiftData.shift_type}
              onValueChange={(value) => {
                setNewShiftData({
                  ...newShiftData, 
                  shift_type: value,
                  start_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].start,
                  end_time: DEFAULT_SHIFT_TIMES[value as keyof typeof DEFAULT_SHIFT_TIMES].end,
                });
              }}
            >
              <SelectTrigger className="col-span-3 bg-background">
                <SelectValue placeholder="בחר סוג משמרת" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {Object.entries(SHIFT_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="start-time">שעת התחלה</Label>
            <Input
              id="start-time"
              type="time"
              value={newShiftData.start_time}
              onChange={(e) => setNewShiftData({...newShiftData, start_time: e.target.value})}
              className="col-span-3 bg-background"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="end-time">שעת סיום</Label>
            <Input
              id="end-time"
              type="time"
              value={newShiftData.end_time}
              onChange={(e) => setNewShiftData({...newShiftData, end_time: e.target.value})}
              className="col-span-3 bg-background"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="person-name">עובד</Label>
            <div className="col-span-3">
              <WorkerSelector 
                value={newShiftData.person_name || null}
                onChange={(value, additionalText) => 
                  setNewShiftData({
                    ...newShiftData, 
                    person_name: value || '', 
                    additional_text: additionalText || ''
                  })
                }
                additionalText={newShiftData.additional_text}
                placeholder="בחר עובד..."
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="is-custom-time" 
              checked={newShiftData.is_custom_time}
              onCheckedChange={(checked) => 
                setNewShiftData({...newShiftData, is_custom_time: checked === true})
              }
            />
            <Label htmlFor="is-custom-time">הדגש שעות מותאמות אישית</Label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox 
              id="is-hidden" 
              checked={newShiftData.is_hidden}
              onCheckedChange={(checked) => 
                setNewShiftData({...newShiftData, is_hidden: checked === true})
              }
            />
            <Label htmlFor="is-hidden">הסתר משמרת</Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveShift}>שמור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDialog;
