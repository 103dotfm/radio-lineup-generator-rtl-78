import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface LineupActionsProps {
  onBack: () => void;
  onSave: () => Promise<void>;
  onShare: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
}

const LineupActions = ({ onBack, onSave, onShare, onPrint, onExportPDF }: LineupActionsProps) => (
  <div className="flex items-center justify-between mb-8">
    <h1 className="text-3xl font-bold">ליינאפ רדיו</h1>
    <Button variant="outline" onClick={onBack}>
      <ArrowRight className="ml-2 h-4 w-4" />
      חזרה ללוח הבקרה
    </Button>
  </div>
);

export default LineupActions;