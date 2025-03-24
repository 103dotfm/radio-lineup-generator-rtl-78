import React from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
interface NextShowEditProps {
  editedText: string;
  setEditedText: (text: string) => void;
  handleApprove: () => void;
  approved: boolean;
  handleRemove: () => void;
}
const NextShowEdit = ({
  editedText,
  setEditedText,
  handleApprove,
  approved,
  handleRemove
}: NextShowEditProps) => {
  return <div className="flex items-center space-x-2 rtl:space-x-reverse">
      <input value={editedText} onChange={e => setEditedText(e.target.value)} disabled={approved} dir="rtl" className="flex-1 p-2 border rounded text-sm width100Percent" />
      
      {approved ? <Button variant="outline" size="sm" onClick={handleRemove}>
          הסר מהקרדיטים
        </Button> : <Button variant="outline" size="sm" onClick={handleApprove}>
          <Check className="h-4 w-4 ml-2" />
          הוסף לקרדיטים
        </Button>}
    </div>;
};
export default NextShowEdit;