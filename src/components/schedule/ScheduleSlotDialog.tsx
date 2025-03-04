
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface ScheduleSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slotData: any) => void;
  editingSlot?: any;
  isMasterSchedule?: boolean;
}

const weekDays = [
  { id: 0, label: 'ראשון' },
  { id: 1, label: 'שני' },
  { id: 2, label: 'שלישי' },
  { id: 3, label: 'רביעי' },
  { id: 4, label: 'חמישי' },
  { id: 5, label: 'שישי' },
  { id: 6, label: 'שבת' },
];

const colorOptions = [
  { value: 'default', label: 'ללא שינוי', bgClass: 'bg-[#F1F1F1]' },
  { value: 'green', label: 'ירוק', bgClass: 'bg-[#eff4ec]' },
  { value: 'yellow', label: 'צהוב', bgClass: 'bg-[#FEF7CD]' },
  { value: 'blue', label: 'כחול', bgClass: 'bg-[#D3E4FD]' },
];

export default function ScheduleSlotDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  editingSlot,
  isMasterSchedule = false
}: ScheduleSlotDialogProps) {
  const [showName, setShowName] = useState(editingSlot?.show_name || '');
  const [hostName, setHostName] = useState(editingSlot?.host_name || '');
  const [startTime, setStartTime] = useState(editingSlot?.start_time?.slice(0, 5) || '');
  const [endTime, setEndTime] = useState(editingSlot?.end_time?.slice(0, 5) || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editingSlot ? [editingSlot.day_of_week] : []
  );
  const [isPrerecorded, setIsPrerecorded] = useState(editingSlot?.is_prerecorded || false);
  const [isCollection, setIsCollection] = useState(editingSlot?.is_collection || false);
  const [slotColor, setSlotColor] = useState('default');
  const [isColorOverrideEnabled, setIsColorOverrideEnabled] = useState(false);

  useEffect(() => {
    if (editingSlot) {
      setShowName(editingSlot.show_name || '');
      setHostName(editingSlot.host_name || '');
      setStartTime(editingSlot.start_time?.slice(0, 5) || '');
      setEndTime(editingSlot.end_time?.slice(0, 5) || '');
      setSelectedDays(editingSlot.day_of_week !== undefined ? [editingSlot.day_of_week] : []);
      setIsPrerecorded(editingSlot.is_prerecorded || false);
      setIsCollection(editingSlot.is_collection || false);
      
      const hasExplicitColor = editingSlot.color !== null && editingSlot.color !== undefined;
      
      setIsColorOverrideEnabled(false);
      
      setSlotColor(hasExplicitColor ? editingSlot.color : 'default');
      
      console.log('Editing slot with data:', {
        id: editingSlot.id,
        show_name: editingSlot.show_name,
        day_of_week: editingSlot.day_of_week,
        start_time: editingSlot.start_time,
        color: editingSlot.color,
        has_lineup: editingSlot.has_lineup,
        is_prerecorded: editingSlot.is_prerecorded,
        is_collection: editingSlot.is_collection,
        is_modified: editingSlot.is_modified
      });
    } else {
      setShowName('');
      setHostName('');
      setStartTime('');
      setEndTime('');
      setSelectedDays([]);
      setIsPrerecorded(false);
      setIsCollection(false);
      setSlotColor('default');
      setIsColorOverrideEnabled(false);
    }
  }, [editingSlot, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSlot) {
      console.log("Updating existing slot:", editingSlot.id);
      
      const updateData = {
        id: editingSlot.id,
        show_name: showName,
        host_name: hostName,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        day_of_week: editingSlot.day_of_week,
        is_prerecorded: isPrerecorded,
        is_collection: isCollection,
        color: isColorOverrideEnabled ? slotColor : null,
        has_lineup: editingSlot.has_lineup
      };
      
      console.log("Updating slot with data:", updateData);
      onSave(updateData);
    } else {
      selectedDays.forEach(dayOfWeek => {
        const slotData = {
          show_name: showName,
          host_name: hostName,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          day_of_week: dayOfWeek,
          is_recurring: isMasterSchedule,
          is_prerecorded: isPrerecorded,
          is_collection: isCollection,
          color: isColorOverrideEnabled ? slotColor : null
        };
        onSave(slotData);
      });
    }
    
    onClose();
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays(current =>
      current.includes(dayId)
        ? current.filter(id => id !== dayId)
        : [...current, dayId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingSlot ? 'ערוך משבצת' : 'הוסף משבצת'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="show-name">שם התוכנית</Label>
              <Input
                id="show-name"
                value={showName}
                onChange={(e) => setShowName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="host-name">שם המגיש/ה</Label>
              <Input
                id="host-name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-time">שעת התחלה</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">שעת סיום</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_prerecorded"
                  checked={isPrerecorded}
                  onCheckedChange={(checked) => setIsPrerecorded(!!checked)}
                />
                <Label htmlFor="is_prerecorded">הוקלט מראש</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_collection"
                  checked={isCollection}
                  onCheckedChange={(checked) => setIsCollection(!!checked)}
                />
                <Label htmlFor="is_collection">לקט</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_color_override"
                  checked={isColorOverrideEnabled}
                  onCheckedChange={(checked) => setIsColorOverrideEnabled(!!checked)}
                />
                <Label htmlFor="enable_color_override">שנה צבע ידנית</Label>
              </div>
            </div>
            {isColorOverrideEnabled && (
              <div className="grid gap-2">
                <Label htmlFor="slot-color">צבע המשבצת</Label>
                <Select 
                  value={slotColor} 
                  onValueChange={setSlotColor}
                  disabled={!isColorOverrideEnabled}
                >
                  <SelectTrigger id="slot-color" className="w-full">
                    <SelectValue placeholder="בחר צבע" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value} className={color.bgClass}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>ימים</Label>
              <div className="flex flex-wrap gap-4">
                {weekDays.map((day) => (
                  <div key={day.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.id}`}
                      checked={selectedDays.includes(day.id)}
                      onCheckedChange={() => toggleDay(day.id)}
                      disabled={editingSlot !== undefined}
                    />
                    <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">שמור</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
