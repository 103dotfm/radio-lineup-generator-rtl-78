
import React, { useEffect } from 'react';
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
  // Ensure proper cleanup when the component unmounts or when dialog closes
  useEffect(() => {
    // Only set this property when the dialog is open
    if (isOpen) {
      // Store the original value to restore it later
      const originalPointerEvents = document.body.style.pointerEvents;
      
      return () => {
        // Restore the original value or set it to empty if there was no original value
        document.body.style.pointerEvents = originalPointerEvents || '';
      };
    }
    
    return undefined;
  }, [isOpen]);

  // Handle dialog close cleanly
  const handleCloseDialog = () => {
    // Ensure pointer-events are reset when dialog closes
    document.body.style.pointerEvents = '';
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent 
        aria-describedby="edit-mode-description"
        onEscapeKeyDown={handleCloseDialog}
        onInteractOutside={handleCloseDialog}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          handleCloseDialog();
        }}
      >
        <DialogHeader>
          <DialogTitle>עריכת משבצת שידור</DialogTitle>
          <DialogDescription id="edit-mode-description">
            בחר כיצד לערוך את המשבצת
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-4">
          <Button onClick={() => {
            handleCloseDialog();
            onEditCurrent();
          }} variant="outline">
            ערוך משבצת נוכחית בלבד
          </Button>
          <Button onClick={() => {
            handleCloseDialog();
            onEditAll();
          }}>
            ערוך את כל המשבצות העתידיות
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditModeDialog;
