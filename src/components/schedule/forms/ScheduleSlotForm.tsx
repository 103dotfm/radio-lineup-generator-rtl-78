
import { Button } from "@/components/ui/button"
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
import { ColorSelector } from "../ui/ColorSelector"
import { DaySelector } from "../ui/DaySelector"
import { DialogFooter } from "@/components/ui/dialog"
import { format } from "date-fns"

interface ScheduleSlotFormProps {
  onSubmit: (slotData: any) => void;
  onClose: () => void;
  editingSlot?: any;
  isMasterSchedule?: boolean;
}

export function ScheduleSlotForm({
  onSubmit,
  onClose,
  editingSlot,
  isMasterSchedule = false
}: ScheduleSlotFormProps) {
  const [showName, setShowName] = useState(editingSlot?.show_name || '');
  const [hostName, setHostName] = useState(editingSlot?.host_name || '');
  const [startTime, setStartTime] = useState(editingSlot?.start_time?.slice(0, 5) || '');
  const [endTime, setEndTime] = useState(editingSlot?.end_time?.slice(0, 5) || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editingSlot ? [new Date(editingSlot.date).getDay()] : []
  );
  const [isPrerecorded, setIsPrerecorded] = useState(editingSlot?.is_prerecorded || false);
  const [isCollection, setIsCollection] = useState(editingSlot?.is_collection || false);
  const [slotColor, setSlotColor] = useState(editingSlot?.color || 'default');
  const [isColorOverrideEnabled, setIsColorOverrideEnabled] = useState(editingSlot?.color ? true : false);

  useEffect(() => {
    if (editingSlot) {
      setShowName(editingSlot.show_name || '');
      setHostName(editingSlot.host_name || '');
      setStartTime(editingSlot.start_time?.slice(0, 5) || '');
      setEndTime(editingSlot.end_time?.slice(0, 5) || '');
      
      if (editingSlot.date) {
        const dayOfWeek = new Date(editingSlot.date).getDay();
        setSelectedDays([dayOfWeek]);
      } else {
        setSelectedDays([]);
      }
      
      setIsPrerecorded(editingSlot.is_prerecorded || false);
      setIsCollection(editingSlot.is_collection || false);
      
      const hasExplicitColor = editingSlot.color !== null && editingSlot.color !== undefined;
      setIsColorOverrideEnabled(hasExplicitColor);
      setSlotColor(hasExplicitColor ? editingSlot.color : 'default');
      
      console.log('Editing slot with data:', {
        id: editingSlot.id,
        show_name: editingSlot.show_name,
        date: editingSlot.date,
        start_time: editingSlot.start_time,
        end_time: editingSlot.end_time,
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
  }, [editingSlot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If end time is not set, auto-calculate it to be 1 hour after start time
    const finalEndTime = endTime || calculateEndTime(startTime);
    
    if (editingSlot) {
      console.log("Updating existing slot:", editingSlot.id);
      
      const updateData = {
        id: editingSlot.id,
        show_name: showName,
        host_name: hostName,
        start_time: `${startTime}:00`,
        end_time: `${finalEndTime}:00`,
        date: editingSlot.date,
        is_prerecorded: isPrerecorded,
        is_collection: isCollection,
        color: isColorOverrideEnabled ? slotColor : null,
        has_lineup: editingSlot.has_lineup || false
      };
      
      console.log("Updating slot with data:", updateData);
      onSubmit(updateData);
    } else {
      if (selectedDays.length === 0) {
        alert('יש לבחור לפחות יום אחד');
        return;
      }
      
      selectedDays.forEach(dayOfWeek => {
        // Calculate the date for the selected day of week
        const date = new Date();
        const diff = (dayOfWeek - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + diff);
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        const slotData = {
          show_name: showName,
          host_name: hostName,
          start_time: `${startTime}:00`,
          end_time: `${finalEndTime}:00`,
          date: formattedDate,
          is_recurring: isMasterSchedule,
          is_prerecorded: isPrerecorded,
          is_collection: isCollection,
          color: isColorOverrideEnabled ? slotColor : null
        };
        
        console.log('Submitting new slot data:', slotData);
        onSubmit(slotData);
      });
    }
    
    onClose();
  };

  const calculateEndTime = (start: string): string => {
    if (!start) return '';
    
    const [hours, minutes] = start.split(':').map(Number);
    const endHour = (hours + 1) % 24;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const toggleDay = (dayId: number) => {
    setSelectedDays(current =>
      current.includes(dayId)
        ? current.filter(id => id !== dayId)
        : [...current, dayId]
    );
  };

  return (
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
              placeholder={startTime ? calculateEndTime(startTime) : ''}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Checkbox
              id="is_prerecorded"
              checked={isPrerecorded}
              onCheckedChange={(checked) => setIsPrerecorded(!!checked)}
            />
            <Label htmlFor="is_prerecorded">הוקלט מראש</Label>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Checkbox
              id="is_collection"
              checked={isCollection}
              onCheckedChange={(checked) => setIsCollection(!!checked)}
            />
            <Label htmlFor="is_collection">לקט</Label>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Checkbox
              id="enable_color_override"
              checked={isColorOverrideEnabled}
              onCheckedChange={(checked) => setIsColorOverrideEnabled(!!checked)}
            />
            <Label htmlFor="enable_color_override">שנה צבע ידנית</Label>
          </div>
        </div>
        
        {isColorOverrideEnabled && (
          <ColorSelector 
            selectedColor={slotColor} 
            onChange={setSlotColor} 
            disabled={!isColorOverrideEnabled} 
          />
        )}
        
        {!editingSlot && (
          <DaySelector 
            selectedDays={selectedDays} 
            toggleDay={toggleDay} 
            disabled={editingSlot !== undefined}
          />
        )}
      </div>
      
      <DialogFooter>
        <Button type="submit">שמור</Button>
      </DialogFooter>
    </form>
  );
}
