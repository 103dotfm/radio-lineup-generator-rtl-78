import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

const SaveDialog = ({ open, onOpenChange, onSave, onDiscard }: SaveDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>שינויים לא שמורים</AlertDialogTitle>
        <AlertDialogDescription>
          האם ברצונך לשמור את השינויים לפני היציאה?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onDiscard}>התעלם משינויים</AlertDialogCancel>
        <AlertDialogAction onClick={() => onSave()}>שמור שינויים</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default SaveDialog;