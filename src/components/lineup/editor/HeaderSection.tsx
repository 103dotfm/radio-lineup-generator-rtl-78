
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface HeaderSectionProps {
  showName: string;
  showDate: Date | undefined;
  onBackToDashboard: () => void;
}

const HeaderSection = ({ showName, showDate, onBackToDashboard }: HeaderSectionProps) => {
  return (
    <div className="lineup-editor-header mb-8 print:hidden" dir="rtl">
      <Button 
        variant="outline" 
        onClick={onBackToDashboard}
        className="flex items-center gap-2 mb-4"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לעמוד הראשי
      </Button>
      
      <h1 className="text-3xl font-bold text-right">
        עריכת ליינאפ - {showName} - {showDate ? format(showDate, 'dd/MM/yyyy', { locale: he }) : 'לא נבחר תאריך'}
      </h1>
    </div>
  );
};

export default HeaderSection;
