
import React from 'react';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface DateRangeSelectorProps {
  exportStartDate: Date | undefined;
  exportEndDate: Date | undefined;
  setExportStartDate: (date: Date | undefined) => void;
  setExportEndDate: (date: Date | undefined) => void;
  disabled: boolean;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  exportStartDate,
  exportEndDate,
  setExportStartDate,
  setExportEndDate,
  disabled
}) => {
  // Helper to format dates for display
  const formatDate = (date?: Date) => {
    if (!date) return 'לא נבחר';
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-4">
      <div className="font-medium">טווח תאריכים (אופציונלי)</div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>מתאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={disabled}
              >
                <Calendar className="ms-2 h-4 w-4" />
                {formatDate(exportStartDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={exportStartDate}
                onSelect={setExportStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>עד תאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={disabled}
              >
                <Calendar className="ms-2 h-4 w-4" />
                {formatDate(exportEndDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={exportEndDate}
                onSelect={setExportEndDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default DateRangeSelector;
