
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ColorSelectorProps {
  selectedColor: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export const colorOptions = [
  { value: 'default', label: 'ללא שינוי', bgClass: 'bg-[#F1F1F1]' },
  { value: 'green', label: 'ירוק', bgClass: 'bg-[#eff4ec]' },
  { value: 'yellow', label: 'צהוב', bgClass: 'bg-[#FEF7CD]' },
  { value: 'blue', label: 'כחול', bgClass: 'bg-[#D3E4FD]' },
];

export function ColorSelector({ selectedColor, onChange, disabled = false }: ColorSelectorProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="slot-color">צבע המשבצת</Label>
      <Select 
        value={selectedColor} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="slot-color" className="w-full">
          <SelectValue placeholder="בחר צבע" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-white">
          {colorOptions.map((color) => (
            <SelectItem key={color.value} value={color.value} className={color.bgClass}>
              {color.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
