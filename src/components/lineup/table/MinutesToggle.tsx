
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
    <div className="flex justify-end items-center space-x-2 p-2 rounded">
      <Switch 
        id="show-minutes" 
        checked={showMinutes} 
        onCheckedChange={onToggleMinutes} 
        className="bg-emerald-400 hover:bg-emerald-300" 
      />
      <Label htmlFor="show-minutes" className="mr-1 sm:mr-2 text-sm sm:text-base font-medium">
        הצגת זמן בדקות
      </Label>
    </div>
  );
};

export default MinutesToggle;
