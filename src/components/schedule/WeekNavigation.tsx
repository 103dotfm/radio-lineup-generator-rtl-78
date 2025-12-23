
import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

interface WeekNavigationProps {
  weekStart: string;
  weekEnd: string;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onPrint: () => void;
}

export default function WeekNavigation({
  weekStart,
  weekEnd,
  onNavigateWeek,
  onPrint
}: WeekNavigationProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 glass-card rounded-[2.5rem] bg-white/40 border-none premium-shadow mt-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="hidden md:flex items-center gap-4 text-slate-800">
        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">טווח תאריכים</span>
          <span className="text-xl font-black tracking-tight">
            {weekStart} <span className="text-slate-200 mx-2">—</span> {weekEnd}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl backdrop-blur-sm border border-slate-200/50 shadow-inner w-full md:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek('prev')}
            className="flex-grow md:flex-initial h-11 px-6 rounded-xl font-bold text-slate-600 hover:text-slate-900 transition-all group"
          >
            <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            שבוע קודם
          </Button>

          <div className="w-px h-6 bg-slate-200/50 mx-1"></div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek('next')}
            className="flex-grow md:flex-initial h-11 px-6 rounded-xl font-bold text-slate-600 hover:text-slate-900 transition-all group"
          >
            שבוע הבא
            <ChevronLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          </Button>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onPrint}
          className="hidden md:flex h-14 px-8 rounded-2xl font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95 gap-3"
        >
          <Printer className="h-5 w-5" />
          <span>הדפסת הלוח</span>
        </Button>
      </div>
    </div>
  );
}
