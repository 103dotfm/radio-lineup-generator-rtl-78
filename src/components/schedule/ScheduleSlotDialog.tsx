
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleSlot } from '@/types/schedule';

interface ScheduleSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  editingSlot?: ScheduleSlot;
}

const ScheduleSlotDialog: React.FC<ScheduleSlotDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSlot
}) => {
  const [showName, setShowName] = React.useState('');
  const [hostName, setHostName] = React.useState('');
  const [dayOfWeek, setDayOfWeek] = React.useState<string>('0');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [isRecurring, setIsRecurring] = React.useState(true);
  const [isPrerecorded, setIsPrerecorded] = React.useState(false);
  const [isCollection, setIsCollection] = React.useState(false);

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (editingSlot) {
        // When editing, load the slot's current data
        console.log('Loading slot data for editing:', editingSlot);
        setShowName(editingSlot.show_name);
        setHostName(editingSlot.host_name || '');
        setDayOfWeek(editingSlot.day_of_week.toString());
        setStartTime(editingSlot.start_time);
        setEndTime(editingSlot.end_time);
        setIsRecurring(editingSlot.is_recurring);
        setIsPrerecorded(editingSlot.is_prerecorded || false);
        setIsCollection(editingSlot.is_collection || false);
      } else {
        // When adding new, reset to defaults
        setShowName('');
        setHostName('');
        setDayOfWeek('0');
        setStartTime('');
        setEndTime('');
        setIsRecurring(true);
        setIsPrerecorded(false);
        setIsCollection(false);
      }
    }
  }, [editingSlot, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      show_name: showName,
      host_name: hostName,
      day_of_week: parseInt(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      is_recurring: isRecurring,
      is_prerecorded: isPrerecorded,
      is_collection: isCollection,
      is_modified: true, // Always mark as modified when saving changes
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingSlot ? 'ערוך משבצת שידור' : 'הוסף משבצת שידור'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="show_name">שם התכנית</Label>
            <Input
              id="show_name"
              value={showName}
              onChange={(e) => setShowName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="host_name">שם המגיש/ה</Label>
            <Input
              id="host_name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="day_of_week">יום</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">שעת התחלה</Label>
              <Input
                id="start_time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">שעת סיום</Label>
              <Input
                id="end_time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(checked: boolean) => setIsRecurring(checked)}
              />
              <Label htmlFor="is_recurring">חוזר על עצמו מדי שבוע</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_prerecorded"
                checked={isPrerecorded}
                onCheckedChange={(checked: boolean) => setIsPrerecorded(checked)}
              />
              <Label htmlFor="is_prerecorded">הוקלט מראש</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_collection"
                checked={isCollection}
                onCheckedChange={(checked: boolean) => setIsCollection(checked)}
              />
              <Label htmlFor="is_collection">לקט</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">
              {editingSlot ? 'שמור שינויים' : 'הוסף משבצת'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSlotDialog;
