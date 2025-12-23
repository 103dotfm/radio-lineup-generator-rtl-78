import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Save, FileDown, FileText } from "lucide-react";
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
  onExportWord: () => void;
  isSaving?: boolean;
}

const ShowHeader = ({
  showName,
  showTime,
  showDate = new Date(),
  onNameChange,
  onTimeChange,
  onDateChange,
  onSave,
  onShare,
  onPrint,
  onExportPDF,
  onExportWord,
  isSaving = false
}: ShowHeaderProps) => {
  // Set default date to today if no date is provided
  React.useEffect(() => {
    if (!showDate) {
      onDateChange(new Date());
    }
  }, []);

  return (
    <div className="glass-card p-10 rounded-[2.5rem] border-none premium-shadow space-y-8 animate-in" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 px-1">שם התוכנית</label>
          <Input
            placeholder="הזן שם תוכנית..."
            value={showName}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="on"
            name="show-name"
            className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 text-xl font-black text-slate-800 transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 px-1">שעת התחלה</label>
          <Input
            type="time"
            value={showTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 text-xl font-black text-slate-800 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 px-1">תאריך</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-14 rounded-2xl justify-start text-right bg-white/50 border-slate-100 text-xl font-black text-slate-800 hover:bg-white hover:border-primary/20 transition-all",
                  !showDate && "text-slate-300"
                )}
              >
                {showDate ? format(showDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white shadow-2xl rounded-2xl border-none" align="start">
              <Calendar
                mode="single"
                selected={showDate}
                onSelect={onDateChange}
                initialFocus
                locale={he}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="h-14 px-10 rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isSaving ? "שומר..." : "שמור ליינאפ"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onPrint}
            variant="ghost"
            className="h-14 px-6 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all gap-2"
          >
            <Printer className="h-5 w-5 text-slate-400" />
            <span>הדפסה</span>
          </Button>

          <Button
            onClick={onShare}
            variant="ghost"
            className="h-14 px-6 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all gap-2"
          >
            <Share2 className="h-5 w-5 text-slate-400" />
            <span>שיתוף</span>
          </Button>

          <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block" />

          <Button
            onClick={onExportPDF}
            variant="ghost"
            className="h-14 px-6 rounded-2xl font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all gap-2"
          >
            <FileDown className="h-5 w-5 text-red-300" />
            <span>PDF</span>
          </Button>

          <Button
            onClick={onExportWord}
            variant="ghost"
            className="h-14 px-6 rounded-2xl font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all gap-2"
          >
            <FileText className="h-5 w-5 text-blue-300" />
            <span>Word</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShowHeader;