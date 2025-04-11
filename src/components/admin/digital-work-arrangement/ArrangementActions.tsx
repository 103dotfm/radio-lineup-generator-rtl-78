
import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Eye, Printer, Download } from 'lucide-react';
import { useArrangement } from './ArrangementContext';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';

interface ArrangementActionsProps {
  previewMode: boolean;
  togglePreviewMode: () => void;
}

const ArrangementActions: React.FC<ArrangementActionsProps> = ({ 
  previewMode, 
  togglePreviewMode 
}) => {
  const { navigateWeek, formatDateRange, weekDate } = useArrangement();

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    const element = document.getElementById('digital-work-arrangement-preview');
    if (!element) return;

    const options = {
      filename: `סידור_עבודה_דיגיטל_${format(weekDate, 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(options).from(element).save();
  };

  return (
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">עורך סידור עבודה דיגיטל</h2>
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronRight className="h-4 w-4 ml-1" />
            שבוע קודם
          </Button>
          <div className="text-sm font-medium mx-2 bg-blue-50 py-1.5 px-3 rounded-full text-blue-700 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDateRange()}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            שבוע הבא
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        </div>
        <Button 
          variant={previewMode ? "default" : "outline"} 
          size="sm" 
          onClick={togglePreviewMode}
        >
          <Eye className="h-4 w-4 ml-1" />
          {previewMode ? "חזרה לעריכה" : "תצוגה מקדימה"}
        </Button>
        
        {previewMode && (
          <div className="flex space-x-2 space-x-reverse">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 ml-1" />
              הדפסה
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <Download className="h-4 w-4 ml-1" />
              ייצוא PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrangementActions;
