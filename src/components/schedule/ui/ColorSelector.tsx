
import { Label } from "@/components/ui/label"
import { Check } from "lucide-react"

interface ColorSelectorProps {
  selectedColor: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export const colorOptions = [
  { value: 'default', label: 'ללא שינוי', bgClass: 'bg-[#F1F1F1]', borderClass: 'border-gray-300' },
  { value: 'green', label: 'ירוק', bgClass: 'bg-[#eff4ec]', borderClass: 'border-green-400' },
  { value: 'yellow', label: 'צהוב', bgClass: 'bg-[#FEF7CD]', borderClass: 'border-yellow-400' },
  { value: 'blue', label: 'כחול', bgClass: 'bg-[#D3E4FD]', borderClass: 'border-blue-400' },
  { value: 'red', label: 'אדום בהיר', bgClass: 'bg-[#FFDEE2]', borderClass: 'border-red-400' },
];

export function ColorSelector({ selectedColor, onChange, disabled = false }: ColorSelectorProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="slot-color">צבע המשבצת</Label>
      <div className="flex gap-2" id="slot-color">
        {colorOptions.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => !disabled && onChange(color.value)}
            disabled={disabled}
            className={`
              relative w-12 h-12 rounded-lg border-2 transition-all duration-200
              ${color.bgClass} ${color.borderClass}
              ${selectedColor === color.value ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            `}
            title={color.label}
          >
            {selectedColor === color.value && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-6 h-6 text-gray-700" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
