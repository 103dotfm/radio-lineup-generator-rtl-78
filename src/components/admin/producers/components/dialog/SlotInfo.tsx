
import React from 'react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { ScheduleSlot } from "@/types/schedule";
import { getCombinedShowDisplay } from '@/utils/showDisplay';

interface SlotInfoProps {
  currentSlot: ScheduleSlot;
  currentWeek?: Date; // Make currentWeek optional
}

const SlotInfo = ({ currentSlot, currentWeek = new Date() }: SlotInfoProps) => {
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  return (
    <div>
      <p className="font-medium">{getCombinedShowDisplay(currentSlot.show_name, currentSlot.host_name)}</p>
      <p className="text-sm text-muted-foreground">
        {dayNames[currentSlot.day_of_week]} {format(addDays(currentWeek, currentSlot.day_of_week), 'dd/MM/yyyy', { locale: he })}, {currentSlot.start_time}
      </p>
    </div>
  );
};

export default SlotInfo;
