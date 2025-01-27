import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Save, FileDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface ShowHeaderProps {
  showName: string;
  showTime: string;
  showDate: Date | undefined;
  onNameChange: (name: string) => void;
  onTimeChange: (time: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onSave: () => Promise<void>;
  onShare: () => Promise<void>;
  onPrint: () => void;
  onExportPDF: () => void;
}

const ShowHeader = ({
  showName,
  showTime,
  showDate,
  onNameChange,
  onTimeChange,
  onDateChange,
  onSave,
  onShare,
  onPrint,
  onExportPDF
}: ShowHeaderProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rtl-grid mb-8">
      <Input
        placeholder="שם התוכנית"
        value={showName}
        onChange={(e) => onNameChange(e.target.value)}
        autoComplete="on"
        name="show-name"
      />
      <Input
        type="time"
        value={showTime}
        onChange={(e) => onTimeChange(e.target.value)}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-right font-normal",
              !showDate && "text-muted-foreground"
            )}
          >
            {showDate ? format(showDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white shadow-lg" align="start">
          <Calendar
            mode="single"
            selected={showDate}
            onSelect={onDateChange}
            initialFocus
            locale={he}
            defaultMonth={new Date()}
          />
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button onClick={onSave} variant="default" className="px-8 font-bold flex-1">
          <Save className="ml-2 h-4 w-4" />
          שמירה
        </Button>
        <Button onClick={onPrint} variant="outline">
          <Printer className="ml-2 h-4 w-4" />
          הדפסה
        </Button>
        <Button onClick={onShare} variant="outline">
          <Share2 className="ml-2 h-4 w-4" />
          שיתוף
        </Button>
        <Button onClick={onExportPDF} variant="outline">
          <FileDown className="ml-2 h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  );
};

export default ShowHeader;