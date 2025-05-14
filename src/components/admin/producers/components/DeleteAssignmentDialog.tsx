
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteCurrentWeek: () => Promise<void>;
  onDeleteAllFuture: () => Promise<void>;
  isRecurring: boolean;
}

const DeleteAssignmentDialog: React.FC<DeleteAssignmentDialogProps> = ({
  isOpen,
  onClose,
  onDeleteCurrentWeek,
  onDeleteAllFuture,
  isRecurring
}) => {
  if (!isRecurring) {
    // For non-recurring assignments, just perform the current week deletion without showing the dialog
    React.useEffect(() => {
      if (isOpen) {
        const handleDelete = async () => {
          await onDeleteCurrentWeek();
          onClose();
        };
        handleDelete();
      }
    }, [isOpen, onDeleteCurrentWeek, onClose]);
    
    return null;
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת שיבוץ</AlertDialogTitle>
          <AlertDialogDescription>
            האם למחוק את השיבוץ משבוע זה בלבד, או מכל השבועות העתידיים?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            ביטול
          </AlertDialogCancel>
          <Button 
            variant="outline"
            onClick={async () => {
              await onDeleteCurrentWeek();
              onClose();
            }}
          >
            שבוע זה בלבד
          </Button>
          <AlertDialogAction
            onClick={async () => {
              await onDeleteAllFuture();
              onClose();
            }}
          >
            כל השבועות העתידיים
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAssignmentDialog;
