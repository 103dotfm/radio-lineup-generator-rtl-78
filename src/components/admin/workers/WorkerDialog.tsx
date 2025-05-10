
import React, { useState, useEffect } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import WorkerForm from './WorkerForm';
import { getWorkerDivisions } from '@/lib/supabase/divisions';

interface WorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWorker: Worker | null;
  formData: Partial<Worker>;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (selectedDivisions?: string[]) => Promise<void>;
  dialogTitle: string;
  submitLabel: string;
}

const WorkerDialog: React.FC<WorkerDialogProps> = ({
  open,
  onOpenChange,
  editingWorker,
  formData,
  onFormChange,
  onSubmit,
  dialogTitle,
  submitLabel
}) => {
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadWorkerDivisions = async () => {
      if (editingWorker) {
        try {
          setIsLoading(true);
          const divisions = await getWorkerDivisions(editingWorker.id);
          setSelectedDivisions(divisions.map(div => div.id));
        } catch (error) {
          console.error('Error loading worker divisions:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSelectedDivisions([]);
      }
    };

    if (open) {
      loadWorkerDivisions();
    }
  }, [editingWorker, open]);

  const handleCloseDialog = () => {
    if (document.body.style.pointerEvents === 'none') {
      document.body.style.pointerEvents = '';
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    await onSubmit(selectedDivisions);
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
        
        {isLoading ? (
          <div className="py-4 text-center">טוען נתונים...</div>
        ) : (
          <WorkerForm 
            formData={formData} 
            onChange={onFormChange}
            onDivisionsChange={setSelectedDivisions}
            selectedDivisions={selectedDivisions}
          />
        )}
        
        <DialogFooter>
          <Button variant="default" onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerDialog;
