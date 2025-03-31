
import React from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { format } from 'date-fns';
import { FileCheck } from 'lucide-react';

interface TextScheduleListProps {
  slots: ScheduleSlot[];
  date: Date;
}

const TextScheduleList: React.FC<TextScheduleListProps> = ({ slots, date }) => {
  // Format the date for display
  const formattedDate = format(date, 'dd/MM');
  const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][date.getDay()];

  return (
    <div className="text-schedule-list w-full max-w-4xl mx-auto" dir="rtl">
      <div className="text-center bg-teal-300 p-2 font-bold text-lg">
        <div>{dayName}</div>
        <div>{formattedDate}</div>
      </div>

      <div className="bg-white">
        {slots.map((slot, index) => {
          // Check if this slot has a special background color
          let bgColorClass = 'bg-white';
          if (slot.start_time >= '13:00' && slot.start_time < '16:00') {
            bgColorClass = 'bg-blue-50';
          } else if (slot.start_time >= '16:00' && slot.start_time < '17:00') {
            bgColorClass = 'bg-green-50';
          } else if (slot.start_time >= '17:00' && slot.start_time < '18:00') {
            bgColorClass = 'bg-yellow-50';
          }

          return (
            <div 
              key={slot.id || index} 
              className={`border-b border-gray-300 flex items-center justify-between p-3 ${bgColorClass}`}
            >
              <div className="flex-grow">
                <div className="font-bold">{slot.show_name}</div>
                {slot.host_name && slot.host_name !== slot.show_name && (
                  <div className="text-sm text-gray-600">{slot.host_name}</div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {slot.has_lineup && (
                  <span className="text-green-600">
                    <FileCheck size={16} />
                  </span>
                )}
                <div className="text-right font-mono">{slot.start_time}</div>
              </div>
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            אין משבצות שידור ליום זה
          </div>
        )}
      </div>
    </div>
  );
};

export default TextScheduleList;
