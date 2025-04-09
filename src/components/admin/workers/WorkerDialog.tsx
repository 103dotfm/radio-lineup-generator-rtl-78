
import React from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WorkerForm from './WorkerForm';

interface WorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWorker: Worker | null;
  formData: Partial<Worker>;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => Promise<void>;
  dialogTitle: string;
  submitLabel: string;
}

const WorkerDialog: React.FC<WorkerDialogProps> = ({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  dialogTitle,
  submitLabel
}) => {
  const handleCloseDialog = () => {
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
        }
        onOpenChange(open);
      }}
    >
      <DialogContent 
        dir="rtl"
        onEscapeKeyDown={handleCloseDialog}
        onInteractOutside={(e) => {
          e.preventDefault();
          handleCloseDialog();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        
        <WorkerForm 
          formData={formData} 
          onChange={onFormChange} 
        />
        
        <DialogFooter>
          <Button variant="default" onClick={onSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerDialog;
