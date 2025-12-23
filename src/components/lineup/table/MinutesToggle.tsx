
import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MinutesToggleProps {
  showMinutes: boolean;
  onToggleMinutes: (checked: boolean) => void;
}

const MinutesToggle: React.FC<MinutesToggleProps> = ({
  showMinutes,
  onToggleMinutes
}) => {
  return (
    <div className="flex justify-end items-center gap-4 p-4 mb-2 animate-in slide-in-from-left-4 duration-500">
      <Label
        htmlFor="show-minutes"
        className="text-sm font-black text-slate-500 cursor-pointer hover:text-slate-800 transition-colors uppercase tracking-widest"
      >
        הצגת זמן בדקות
      </Label>
      <div className="relative flex items-center bg-slate-100/50 p-1.5 rounded-full backdrop-blur-sm border border-slate-200/50 shadow-inner">
        <Switch
          id="show-minutes"
          checked={showMinutes}
          onCheckedChange={onToggleMinutes}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-300 transition-all scale-110"
        />
      </div>
    </div>
  );
};

export default MinutesToggle;
