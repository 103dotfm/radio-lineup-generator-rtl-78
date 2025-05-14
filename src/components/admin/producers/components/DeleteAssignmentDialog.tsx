
import React, { useState } from 'react';
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
import { AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

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
  const [isDeleting, setIsDeleting] = useState(false);
  
  // For non-recurring assignments, directly call delete for current week without showing dialog
  React.useEffect(() => {
    if (isOpen && !isRecurring) {
      handleDeleteCurrentWeek();
    }
  }, [isOpen, isRecurring]);
  
  const handleDeleteCurrentWeek = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await onDeleteCurrentWeek();
      onClose();
    } catch (error) {
      console.error("Error in delete current week:", error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת השיבוץ",
        description: "לא ניתן היה למחוק את השיבוץ, אנא נסה שוב"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDeleteAllFuture = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await onDeleteAllFuture();
      onClose();
    } catch (error) {
      console.error("Error in delete all future:", error);
      toast({
        variant: "destructive",
        title: "שגיאה במחיקת השיבוצים העתידיים",
        description: "לא ניתן היה למחוק את השיבוצים העתידיים, אנא נסה שוב"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Only show the dialog for recurring assignments
  if (!isRecurring) {
    return null;
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isDeleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת שיבוץ</AlertDialogTitle>
          <AlertDialogDescription>
            האם למחוק את השיבוץ משבוע זה בלבד, או מכל השבועות העתידיים?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center justify-end gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleting}
          >
            ביטול
          </AlertDialogCancel>
          <Button 
            variant="outline"
            onClick={handleDeleteCurrentWeek}
            disabled={isDeleting}
          >
            שבוע זה בלבד
          </Button>
          <AlertDialogAction
            onClick={handleDeleteAllFuture}
            disabled={isDeleting}
          >
            מהשבוע ואילך
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAssignmentDialog;
