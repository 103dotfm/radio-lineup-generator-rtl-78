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
import { format, startOfWeek, addDays } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { checkSlotConflicts, getScheduleAutocomplete } from "@/lib/api/schedule"
import { ScheduleSlot } from "@/types/schedule"
import RDSFields from "./RDSFields"
import { AutocompleteInput } from "./AutocompleteInput"
import { Copy } from "lucide-react"

interface ScheduleSlotFormProps {
  onSubmit: (slotData: any) => void;
  onClose: () => void;
  editingSlot?: any;
  isMasterSchedule?: boolean;
  scheduleSlots?: any[];
  refetchSlots?: () => void;
  selectedDate?: Date;
}

export function ScheduleSlotForm({
  onSubmit,
  onClose,
  editingSlot,
  isMasterSchedule = false,
  scheduleSlots = [],
  refetchSlots,
  selectedDate
}: ScheduleSlotFormProps) {
  const [showName, setShowName] = useState(editingSlot?.show_name || '');
  const [hostName, setHostName] = useState(editingSlot?.host_name || '');
  const [startTime, setStartTime] = useState(editingSlot?.start_time?.slice(0, 5) || '');
  const [endTime, setEndTime] = useState(editingSlot?.end_time?.slice(0, 5) || '');
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editingSlot ? [editingSlot.day_of_week] : []
  );
  const [isPrerecorded, setIsPrerecorded] = useState(editingSlot?.is_prerecorded || false);
  const [isCollection, setIsCollection] = useState(editingSlot?.is_collection || false);
  const [isRecurring, setIsRecurring] = useState(editingSlot?.is_recurring || false);
  const [slotColor, setSlotColor] = useState(editingSlot?.color || 'default');
  const [isColorOverrideEnabled, setIsColorOverrideEnabled] = useState(editingSlot?.color ? true : false);
  const [isSlotSaving, setIsSlotSaving] = useState(false);
  
  // Autocomplete suggestions
  const [showNameSuggestions, setShowNameSuggestions] = useState<string[]>([]);
  const [hostNameSuggestions, setHostNameSuggestions] = useState<string[]>([]);
  
  // RDS fields
  const [rdsPty, setRdsPty] = useState(editingSlot?.rds_pty || 1);
  const [rdsMs, setRdsMs] = useState(editingSlot?.rds_ms || 0);
  const [rdsRadioText, setRdsRadioText] = useState(editingSlot?.rds_radio_text || '');
  const [rdsRadioTextTranslated, setRdsRadioTextTranslated] = useState(editingSlot?.rds_radio_text_translated || '');

  // Fetch autocomplete suggestions on mount
  useEffect(() => {
    const fetchAutocompleteData = async () => {
      try {
        const data = await getScheduleAutocomplete();
        setShowNameSuggestions(data.showNames);
        setHostNameSuggestions(data.hostNames);
      } catch (error) {
        console.error('Error fetching autocomplete data:', error);
        // Continue with empty suggestions - form will still work
      }
    };
    fetchAutocompleteData();
  }, []);

  useEffect(() => {
    if (editingSlot) {
      setShowName(editingSlot.show_name || '');
      setHostName(editingSlot.host_name || '');
      setStartTime(editingSlot.start_time?.slice(0, 5) || '');
      setEndTime(editingSlot.end_time?.slice(0, 5) || '');
      setSelectedDays(editingSlot.day_of_week !== undefined ? [editingSlot.day_of_week] : []);
      setIsPrerecorded(editingSlot.is_prerecorded || false);
      setIsCollection(editingSlot.is_collection || false);
      setIsRecurring(editingSlot.is_recurring || false);
      
      const hasExplicitColor = editingSlot.color !== null && editingSlot.color !== undefined;
      setIsColorOverrideEnabled(hasExplicitColor);
      setSlotColor(hasExplicitColor ? editingSlot.color : 'default');
      
      // Set RDS fields
      setRdsPty(editingSlot.rds_pty || 1);
      setRdsMs(editingSlot.rds_ms || 0);
      setRdsRadioText(editingSlot.rds_radio_text || '');
      setRdsRadioTextTranslated(editingSlot.rds_radio_text_translated || '');
    } else {
      setShowName('');
      setHostName('');
      setStartTime('');
      setEndTime('');
      setSelectedDays([]);
      setIsPrerecorded(false);
      setIsCollection(false);
      setIsRecurring(false);
      setSlotColor('default');
      setIsColorOverrideEnabled(false);
      
      // Reset RDS fields
      setRdsPty(1);
      setRdsMs(0);
      setRdsRadioText('');
      setRdsRadioTextTranslated('');
    }
  }, [editingSlot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSlotSaving) return;

    setIsSlotSaving(true);

    try {
      if (!showName || !startTime || !endTime) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        setIsSlotSaving(false);
        return;
      }

      const formattedStartTime = `${startTime}:00`;
      const formattedEndTime = `${endTime}:00`;


      // Check for conflicts on all selected days
      let hasConflict = false as boolean;
      let conflictingSlot: any = null;
      try {
        for (const day of selectedDays) {
          const actualSelectedDate = selectedDate || new Date();
          
          // For weekly schedule, calculate the correct date for the selected day within the current week
          let correctSlotDate: string;
          if (!isMasterSchedule) {
            // Get the week start (Sunday) for the selected date
            const weekStart = startOfWeek(actualSelectedDate, { weekStartsOn: 0 });
            // Add the day offset to get the correct date for this day of the week
            const targetDate = addDays(weekStart, day);
            correctSlotDate = format(targetDate, 'yyyy-MM-dd');
          } else {
            // For master schedule, just use the selectedDate as-is
            correctSlotDate = format(actualSelectedDate, 'yyyy-MM-dd');
          }
          
          const result = await checkSlotConflicts(
            correctSlotDate,
            day,
            formattedStartTime,
            formattedEndTime,
            editingSlot?.id,
            isMasterSchedule
          );
          const dayConflict = !!result?.hasConflict;
          const dayConflictingSlot = result?.conflictingSlot;
          if (dayConflict) {
            hasConflict = true;
            conflictingSlot = dayConflictingSlot;
            break;
          }
        }
      } catch (conflictErr) {
        console.warn('Conflict check failed, proceeding without blocking edit:', conflictErr);
        hasConflict = false;
        conflictingSlot = null;
      }

      if (hasConflict) {
        toast({
          title: "Time Conflict",
          description: `This time slot conflicts with "${conflictingSlot?.show_name}"`,
          variant: "destructive"
        });
        setIsSlotSaving(false);
        return;
      }

      if (editingSlot) {

        
        const updateData = {
          id: editingSlot.id,
          show_name: showName,
          host_name: hostName,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          day_of_week: selectedDays.length > 0 ? selectedDays[0] : editingSlot.day_of_week,
          is_prerecorded: isPrerecorded,
          is_collection: isCollection,
          is_recurring: isRecurring,
          color: isColorOverrideEnabled ? slotColor : null,
          has_lineup: editingSlot.has_lineup !== undefined ? editingSlot.has_lineup : false,
          rds_pty: rdsPty,
          rds_ms: rdsMs,
          rds_radio_text: rdsRadioText,
          rds_radio_text_translated: rdsRadioTextTranslated
        };
        


        await onSubmit(updateData);
      } else {

        
        // Check for existing slot at the same day and start time
        let slotConflict = false;
        for (const day of selectedDays) {
          const conflictingSlot = scheduleSlots.find(
            slot => slot.day_of_week === day && slot.start_time === formattedStartTime && !slot.is_deleted
          );
          if (conflictingSlot) {
            alert(`A slot already exists for day ${day} at ${formattedStartTime}: ${conflictingSlot.show_name}. Please choose a different time or day, or edit the existing slot.`);
            slotConflict = true;
            break;
          }
        }
        if (slotConflict) return;
        
        if (isMasterSchedule) {
          // For master schedule, create a slot for each selected day
          const slotsToCreate: Partial<ScheduleSlot>[] = [];
          selectedDays.forEach(dayOfWeek => {
            const newSlot: Partial<ScheduleSlot> = {
              show_name: showName,
              host_name: hostName,
              start_time: formattedStartTime,
              end_time: formattedEndTime,
              day_of_week: dayOfWeek,
              is_prerecorded: isPrerecorded,
              is_collection: isCollection,
              is_recurring: isRecurring,
              color: isColorOverrideEnabled ? slotColor : null,
              has_lineup: false,
              slot_date: format(startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd'),
              is_master: true,
              is_deleted: false,
              rds_pty: rdsPty,
              rds_ms: rdsMs,
              rds_radio_text: rdsRadioText,
              rds_radio_text_translated: rdsRadioTextTranslated
            };
            slotsToCreate.push(newSlot);
          });
          
          // Submit all slots at once
          console.log(`Creating ${slotsToCreate.length} slots for master schedule:`, slotsToCreate);
          slotsToCreate.forEach(slot => {
            onSubmit(slot);
          });
        } else {
          // For weekly schedule, use the selected day and calculate the correct date
          const actualSelectedDate = selectedDate || new Date();
          
          // Use the first selected day if any, otherwise fall back to the day of selectedDate
          const dayOfWeek = selectedDays.length > 0 ? selectedDays[0] : actualSelectedDate.getDay();
          
          // Calculate the correct date for this day within the current week
          const weekStart = startOfWeek(actualSelectedDate, { weekStartsOn: 0 });
          const targetDate = addDays(weekStart, dayOfWeek);
          const calculatedSlotDate = format(targetDate, 'yyyy-MM-dd');
          
          const newSlot: Partial<ScheduleSlot> = {
            show_name: showName,
            host_name: hostName,
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            day_of_week: dayOfWeek,
            is_prerecorded: isPrerecorded,
            is_collection: isCollection,
            is_recurring: isRecurring,
            color: isColorOverrideEnabled ? slotColor : null,
            has_lineup: false,
            slot_date: calculatedSlotDate,
            is_master: false,
            is_deleted: false,
            rds_pty: rdsPty,
            rds_ms: rdsMs,
            rds_radio_text: rdsRadioText,
            rds_radio_text_translated: rdsRadioTextTranslated
          };
          console.log("Creating new slot with data:", newSlot);
          onSubmit(newSlot);
        }
      }
      
      // Refetch slots to update the UI immediately (only if refetchSlots is provided)
      if (typeof refetchSlots === 'function') {
        try {
          refetchSlots();
        } catch (error) {
          console.warn("Error calling refetchSlots - it may not be defined:", error);
        }
      }
      
      onClose();
    } catch (error) {
      console.error("Error checking slot conflicts:", error);
      toast({
        title: "Error",
        description: "An error occurred while checking slot conflicts",
        variant: "destructive"
      });
      setIsSlotSaving(false);
    }
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
      {/* Show Details Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg mb-4">פרטי התוכנית</h3>
        
        <div className="grid gap-2">
          <Label htmlFor="show-name">שם התוכנית</Label>
          <AutocompleteInput
            id="show-name"
            value={showName}
            onChange={setShowName}
            suggestions={showNameSuggestions}
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="host-name">שם המגיש/ה</Label>
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 z-10"
              onClick={() => setHostName(showName)}
              title="העתק משם התוכנית"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <div className="pl-8">
              <AutocompleteInput
                id="host-name"
                value={hostName}
                onChange={setHostName}
                suggestions={hostNameSuggestions}
                required
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="start-time">שעת פתיחה</Label>
            <Input
              id="start-time"
              type="text"
              inputMode="numeric"
              pattern="^([01]\d|2[0-3]):([0-5]\d)$"
              placeholder="08:30"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end-time">שעת סיום</Label>
            <Input
              id="end-time"
              type="text"
              inputMode="numeric"
              pattern="^([01]\d|2[0-3]):([0-5]\d)$"
              placeholder="10:00"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
        
        {/* Checkboxes with improved mobile layout */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_prerecorded"
                checked={isPrerecorded}
                onCheckedChange={(checked) => setIsPrerecorded(!!checked)}
              />
              <Label htmlFor="is_prerecorded" className="text-sm">הוקלט מראש</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_collection"
                checked={isCollection}
                onCheckedChange={(checked) => setIsCollection(!!checked)}
              />
              <Label htmlFor="is_collection" className="text-sm">לקט</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(!!checked)}
              />
              <Label htmlFor="is_recurring" className="text-sm">חוזר</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_color_override"
                checked={isColorOverrideEnabled}
                onCheckedChange={(checked) => setIsColorOverrideEnabled(!!checked)}
              />
              <Label htmlFor="enable_color_override" className="text-sm">שנה צבע ידנית</Label>
            </div>
          </div>
        </div>
        
        {isColorOverrideEnabled && (
          <ColorSelector 
            selectedColor={slotColor} 
            onChange={setSlotColor} 
            disabled={!isColorOverrideEnabled} 
          />
        )}
        
        {/* Days selection with improved mobile layout */}
        <div className="grid gap-2">
          <Label>ימים נבחרים</Label>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <Checkbox
                  id={`day-${index}`}
                  checked={selectedDays.includes(index)}
                  onCheckedChange={() => toggleDay(index)}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
                <Label htmlFor={`day-${index}`} className="text-xs sm:text-sm mt-1 text-center">{day}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* RDS Section - Full Width */}
      <div className="space-y-4 pt-4 border-t">
        <RDSFields
          show_name={showName}
          host_name={hostName}
          rds_pty={rdsPty}
          rds_ms={rdsMs}
          rds_radio_text={rdsRadioText}
          rds_radio_text_translated={rdsRadioTextTranslated}
          onRDSChange={(field, value) => {
            switch (field) {
              case 'rds_pty':
                setRdsPty(value);
                break;
              case 'rds_ms':
                setRdsMs(value);
                break;
              case 'rds_radio_text':
                setRdsRadioText(value);
                break;
              case 'rds_radio_text_translated':
                setRdsRadioTextTranslated(value);
                break;
            }
          }}
        />
      </div>
      
      <DialogFooter>
        <Button type="submit">שמור</Button>
      </DialogFooter>
    </form>
  );
}
