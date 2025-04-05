
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EditModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditCurrent: () => void;
  onEditAll: () => void;
}

const EditModeDialog: React.FC<EditModeDialogProps> = ({
  isOpen,
  onClose,
  onEditCurrent,
  onEditAll,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="edit-mode-description">
        <DialogHeader>
          <DialogTitle>עריכת משבצת שידור</DialogTitle>
          <DialogDescription id="edit-mode-description">
            בחר כיצד לערוך את המשבצת
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Button onClick={onEditCurrent} variant="outline">
            ערוך משבצת נוכחית בלבד
          </Button>
          <Button onClick={onEditAll}>
            ערוך את כל המשבצות העתידיות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditModeDialog;
