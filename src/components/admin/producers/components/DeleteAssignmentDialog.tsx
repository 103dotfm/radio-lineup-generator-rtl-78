
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
  onDeleteCurrentWeek: () => void;
  onDeleteAllFuture: () => void;
  isRecurring: boolean;
}

const DeleteAssignmentDialog: React.FC<DeleteAssignmentDialogProps> = ({
  isOpen,
  onClose,
  onDeleteCurrentWeek,
  onDeleteAllFuture,
  isRecurring
}) => {
  // For non-recurring assignments, directly call delete for current week without showing dialog
  React.useEffect(() => {
    if (isOpen && !isRecurring) {
      onDeleteCurrentWeek();
      onClose();
    }
  }, [isOpen, isRecurring, onDeleteCurrentWeek, onClose]);
  
  // Only show the dialog for recurring assignments
  if (!isRecurring) {
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
            onClick={() => {
              onDeleteCurrentWeek();
              onClose();
            }}
          >
            שבוע זה בלבד
          </Button>
          <AlertDialogAction
            onClick={() => {
              onDeleteAllFuture();
              onClose();
            }}
          >
            מהשבוע ואילך
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAssignmentDialog;
