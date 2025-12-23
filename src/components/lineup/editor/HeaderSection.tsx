import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Archive } from "lucide-react";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface HeaderSectionProps {
  showName: string;
  showDate: Date | undefined;
  onBackToDashboard: () => void;
  isBackupShow?: boolean;
}

const HeaderSection = ({ showName, showDate, onBackToDashboard, isBackupShow }: HeaderSectionProps) => {
  return (
    <div className="lineup-editor-header mb-12 animate-in fade-in slide-in-from-top-4 duration-700" dir="rtl">
      <Button
        variant="ghost"
        onClick={onBackToDashboard}
        className="flex items-center gap-2 mb-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all group"
      >
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="font-bold">חזרה ללוח הבקרה</span>
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-4xl font-black text-right text-slate-900 tracking-tight">
          {showName}
          <span className="mx-4 text-slate-200 font-light">|</span>
          <span className="text-slate-400 font-bold">
            {showDate ? format(showDate, 'EEEE, d MMMM yyyy', { locale: he }) : 'לא נבחר תאריך'}
          </span>
        </h1>

        {isBackupShow && (
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl border border-blue-100 shadow-sm animate-pulse-subtle">
            <Archive className="h-4 w-4" />
            <span>מצב קריאה בלבד</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderSection;
