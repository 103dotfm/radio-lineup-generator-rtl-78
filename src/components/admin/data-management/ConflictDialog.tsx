
import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type ConflictItem = {
  id: string;
  table: string;
  existingData: any;
  newData: any;
  resolution?: 'overwrite' | 'keep';
};

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictItem;
  currentIndex: number;
  totalConflicts: number;
  onResolve: (resolution: 'overwrite' | 'keep') => void;
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  open,
  onOpenChange,
  conflict,
  currentIndex,
  totalConflicts,
  onResolve,
}) => {
  if (!conflict) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            התנגשות נתונים {currentIndex + 1} מתוך {totalConflicts}
          </DialogTitle>
          <DialogDescription>
            קיימת התנגשות בין נתונים קיימים במערכת לבין נתונים בקובץ הייבוא.
            בחר כיצד לטפל בהתנגשות זו.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-auto">
          <div className="flex justify-between">
            <span className="font-semibold">טבלה:</span>
            <span>{conflict.table}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">מזהה רשומה:</span>
            <span>{conflict.id}</span>
          </div>
          
          <div className="border p-3 rounded-md bg-gray-50">
            <h4 className="font-medium mb-2">נתונים קיימים במערכת:</h4>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(conflict.existingData, null, 2)}</pre>
          </div>
          
          <div className="border p-3 rounded-md bg-blue-50">
            <h4 className="font-medium mb-2">נתונים חדשים מהקובץ:</h4>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(conflict.newData, null, 2)}</pre>
          </div>
        </div>
        
        <DialogFooter className="space-x-2 space-x-reverse">
          <Button variant="outline" onClick={() => onResolve('keep')}>
            <Check className="h-4 w-4 ms-2" />
            שמור על הנתונים הקיימים
          </Button>
          <Button onClick={() => onResolve('overwrite')}>
            <X className="h-4 w-4 ms-2" />
            דרוס בנתונים החדשים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
