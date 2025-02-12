
import React from 'react';
import { Button } from "@/components/ui/button";
import { Save, Share2, Printer, FileDown } from "lucide-react";

interface LineupActionsProps {
  onSave: () => Promise<void>;
  onShare: () => Promise<void>;
  onPrint: () => void;
  onExportPDF: () => void;
}

const LineupActions = ({
  onSave,
  onShare,
  onPrint,
  onExportPDF,
}: LineupActionsProps) => {
  return (
    <div className="flex gap-2">
      <Button onClick={onSave} className="gap-2">
        <Save className="h-4 w-4" />
        שמור
      </Button>
      <Button onClick={onShare} variant="outline" className="gap-2">
        <Share2 className="h-4 w-4" />
        שתף
      </Button>
      <Button onClick={onPrint} variant="outline" className="gap-2">
        <Printer className="h-4 w-4" />
        הדפס
      </Button>
      <Button onClick={onExportPDF} variant="outline" className="gap-2">
        <FileDown className="h-4 w-4" />
        ייצא ל־PDF
      </Button>
    </div>
  );
};

export default LineupActions;
