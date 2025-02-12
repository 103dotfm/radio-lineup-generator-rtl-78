
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ShowInfoProps {
  showName: string;
  showTime: string;
  showDate: Date | undefined;
  onNameChange: (name: string) => void;
  onTimeChange: (time: string) => void;
  onDateChange: (date: Date | undefined) => void;
}

const ShowInfo = ({
  showName,
  showTime,
  showDate,
  onNameChange,
  onTimeChange,
  onDateChange,
}: ShowInfoProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <Input
          placeholder="שם התוכנית"
          value={showName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <Input
          placeholder="שעה"
          value={showTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-right font-normal",
                !showDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {showDate ? format(showDate, "PPP") : <span>בחר תאריך</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={showDate}
              onSelect={onDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ShowInfo;
