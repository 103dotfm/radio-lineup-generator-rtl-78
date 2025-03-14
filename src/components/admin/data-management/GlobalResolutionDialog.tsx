
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
} from '@/components/ui/alert-dialog';

type ConflictResolution = 'overwrite' | 'keep' | 'ask';

interface GlobalResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictCount: number;
  onResolve: (resolution: ConflictResolution) => void;
}

export const GlobalResolutionDialog: React.FC<GlobalResolutionDialogProps> = ({
  open,
  onOpenChange,
  conflictCount,
  onResolve,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>נמצאו {conflictCount} התנגשויות נתונים</AlertDialogTitle>
          <AlertDialogDescription>
            נמצאו רשומות בקובץ שכבר קיימות במערכת. כיצד ברצונך לטפל בהתנגשויות אלו?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            בטל ייבוא
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onResolve('keep')}>
            שמור על הנתונים הקיימים
          </AlertDialogAction>
          <AlertDialogAction onClick={() => onResolve('overwrite')}>
            דרוס בנתונים החדשים
          </AlertDialogAction>
          <AlertDialogAction onClick={() => onResolve('ask')}>
            בדוק כל התנגשות
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
