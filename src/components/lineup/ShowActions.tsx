import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ShowActionsProps {
  hasUnsavedChanges: boolean;
  showUnsavedDialog: boolean;
  setShowUnsavedDialog: (show: boolean) => void;
  handleSave: () => Promise<void>;
  navigate: (path: string) => void;
}

const ShowActions = ({
  hasUnsavedChanges,
  showUnsavedDialog,
  setShowUnsavedDialog,
  handleSave,
  navigate
}: ShowActionsProps) => {
  return (
    <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>שינויים לא שמורים</AlertDialogTitle>
          <AlertDialogDescription>
            יש לך שינויים שלא נשמרו. האם ברצונך לשמור אותם לפני החזרה ללוח הבקרה?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => navigate('/')}>
            התעלם משינויים
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await handleSave();
              navigate('/');
            }}
          >
            שמור ועבור ללוח הבקרה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ShowActions;