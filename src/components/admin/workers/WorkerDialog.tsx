
import React, { useState, useEffect, useCallback } from 'react';
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

  // Memoize the worker ID to prevent unnecessary rerenders
  const workerId = editingWorker?.id;

  const loadWorkerDivisions = useCallback(async () => {
    if (workerId) {
      try {
        setIsLoading(true);
        // Try to use cached data first
        const cacheKey = `worker-divisions-${workerId}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            const cacheTime = parsed.timestamp || 0;
            // Cache valid for 5 minutes
            if (Date.now() - cacheTime < 5 * 60 * 1000) {
              setSelectedDivisions(parsed.divisions || []);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing worker divisions cache:', e);
          }
        }
        
        const divisions = await getWorkerDivisions(workerId);
        const divisionIds = divisions.map(div => div.id);
        
        // Update cache
        sessionStorage.setItem(cacheKey, JSON.stringify({
          divisions: divisionIds,
          timestamp: Date.now()
        }));
        
        setSelectedDivisions(divisionIds);
      } catch (error) {
        console.error('Error loading worker divisions:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSelectedDivisions([]);
    }
  }, [workerId]);

  useEffect(() => {
    if (open) {
      loadWorkerDivisions();
    }
  }, [open, loadWorkerDivisions]);

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
        className="max-w-md w-full"
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

export default React.memo(WorkerDialog);
