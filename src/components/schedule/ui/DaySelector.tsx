
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface DaySelectorProps {
  selectedDays: number[];
  toggleDay: (dayId: number) => void;
  disabled?: boolean;
}

export const weekDays = [
  { id: 0, label: 'ראשון' },
  { id: 1, label: 'שני' },
  { id: 2, label: 'שלישי' },
  { id: 3, label: 'רביעי' },
  { id: 4, label: 'חמישי' },
  { id: 5, label: 'שישי' },
  { id: 6, label: 'שבת' },
];

export function DaySelector({ selectedDays, toggleDay, disabled = false }: DaySelectorProps) {
  return (
    <div className="grid gap-2">
      <Label>ימים</Label>
      <div className="flex flex-wrap gap-4">
        {weekDays.map((day) => (
          <div key={day.id} className="flex items-center space-x-2">
            <Checkbox
              id={`day-${day.id}`}
              checked={selectedDays.includes(day.id)}
              onCheckedChange={() => toggleDay(day.id)}
              disabled={disabled}
            />
            <Label htmlFor={`day-${day.id}`}>{day.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
