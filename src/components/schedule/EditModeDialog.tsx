
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
  // Ensure proper cleanup when the component unmounts or dialog closes
  useEffect(() => {
    // Clean up function to run on unmount or when dependency changes
    return () => {
      // Reset pointer-events style if it was set
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, [isOpen]); // Re-run effect when isOpen changes

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
