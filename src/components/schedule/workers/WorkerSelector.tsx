
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Worker, getWorkers } from '@/lib/supabase/workers';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

interface WorkerSelectorProps {
  value: string | null;
  onChange: (value: string | null, fullText?: string) => void;
  additionalText?: string;
  placeholder?: string;
  className?: string;
  department?: string;
}

export const WorkerSelector = ({ 
  value, 
  onChange, 
  additionalText = "", 
  placeholder = "בחר עובד...", 
  className,
  department
}: WorkerSelectorProps) => {
  // State management
  const [inputValue, setInputValue] = useState(additionalText || "");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  // Dialog state for advanced search
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Toast for notifications
  const { toast } = useToast();
  
  // Find the selected worker name
  const selectedWorker = workers.find(worker => worker.id === value);
  const displayValue = selectedWorker ? selectedWorker.name : "";
  
  // Fetch workers from database
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('WorkerSelector: Fetching workers');
        let data;
        
        // Fetch workers based on department if specified
        if (department) {
          console.log(`WorkerSelector: Filtering by department "${department}"`);
          
          // Use multiple possible department values for producers
          if (department === 'מפיקים' || department === 'producers') {
            console.log('WorkerSelector: Using producer departments filter');
            const { data: departmentWorkers, error } = await supabase
              .from('workers')
              .select('*')
              .or('department.eq.מפיקים,department.eq.מפיק,department.eq.הפקה,department.eq.producers,department.eq.Production staff')
              .order('name');
              
            if (error) {
              console.error('Error fetching producers:', error);
              throw error;
            }
            
            console.log(`WorkerSelector: Found ${departmentWorkers?.length || 0} producers`);
            data = departmentWorkers;
          } else {
            // For other departments, use exact matching
            const { data: departmentWorkers, error } = await supabase
              .from('workers')
              .select('*')
              .eq('department', department)
              .order('name');
              
            if (error) throw error;
            data = departmentWorkers;
          }
        } else {
          data = await getWorkers();
        }
        
        console.log(`WorkerSelector: Fetched ${data?.length || 0} workers`);
        setWorkers(data || []);
        // Reset retry count on success
        setRetryCount(0);
      } catch (error) {
        console.error('Error fetching workers:', error);
        setError('שגיאה בטעינת רשימת העובדים');
        
        // If we haven't retried too many times, try again
        if (retryCount < 3) {
          console.log(`Retrying worker fetch (attempt ${retryCount + 1})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            fetchWorkers();
          }, 2000); // Wait 2 seconds before retrying
        } else {
          toast({
            title: "שגיאה",
            description: "שגיאה בטעינת רשימת העובדים לאחר מספר ניסיונות",
            variant: "destructive",
          });
        }
        
        // Ensure workers is always an array even on error
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkers();
  }, [toast, department, retryCount]);
  
  const handleSelect = (workerId: string) => {
    // Toggle selection if clicking the same item
    const newValue = value === workerId ? null : workerId;
    onChange(newValue, inputValue);
    setDialogOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(value, e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRetry = () => {
    setRetryCount(0);
    setWorkers([]);
    setLoading(true);
    const fetchWorkers = async () => {
      try {
        console.log('WorkerSelector: Retrying fetch workers');
        const data = await getWorkers();
        console.log(`WorkerSelector: Retried fetch ${data.length} workers`);
        setWorkers(data || []);
        setError(null);
      } catch (error) {
        console.error('Error in retry fetching workers:', error);
        setError('שגיאה בטעינת רשימת העובדים');
        toast({
          title: "שגיאה",
          description: "שגיאה בטעינת רשימת העובדים",
          variant: "destructive",
        });
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  };

  // Select dropdown handling
  const handleSelectChange = (workerId: string) => {
    onChange(workerId, inputValue);
  };
  
  // Filter workers based on search query
  const filteredWorkers = searchQuery 
    ? workers.filter(worker => 
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (worker.department && worker.department.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : workers;

  // Loading state
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)} dir="rtl">
        <div className="flex items-center justify-center p-2 border rounded bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>טוען עובדים...</span>
        </div>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="הערות נוספות..."
          className="mt-2"
        />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col gap-2", className)} dir="rtl">
        <div className="flex items-center justify-between p-2 border rounded bg-red-50 text-red-700">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            נסה שנית
          </Button>
        </div>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="הערות נוספות..."
          className="mt-2"
        />
      </div>
    );
  }
  
  return (
    <div className={cn("flex flex-col gap-2", className)} dir="rtl">
      {/* Using reliable Select dropdown component */}
      <Select value={value || ""} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {displayValue || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          {workers.map((worker) => (
            <SelectItem key={worker.id} value={worker.id}>
              {worker.name}
              {worker.department && (
                <span className="text-gray-500 text-sm"> ({worker.department})</span>
              )}
            </SelectItem>
          ))}
          
          {/* Advanced search option */}
          <Button 
            variant="ghost" 
            onClick={() => setDialogOpen(true)} 
            className="w-full justify-start text-sm mt-2"
          >
            חיפוש מתקדם...
          </Button>
        </SelectContent>
      </Select>
      
      {/* Advanced search dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>חיפוש עובדים מתקדם</DialogTitle>
          </DialogHeader>
          
          <div className="p-2">
            <Input
              placeholder="חיפוש עובדים..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="mb-2"
              autoFocus
            />
            
            {error && (
              <div className="p-2 text-sm text-red-500 border border-red-200 rounded mb-2 flex items-center justify-between">
                <span>{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="ml-2 text-xs"
                >
                  ניסיון מחדש
                </Button>
              </div>
            )}
            
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <div className="text-muted-foreground">טוען עובדים...</div>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground">
                  {searchQuery ? "לא נמצאו עובדים" : "אין עובדים זמינים"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredWorkers.map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        "cursor-pointer",
                        value === worker.id && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleSelect(worker.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === worker.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{worker.name}</span>
                      {worker.department && (
                        <span className="text-gray-500 text-sm mr-2">({worker.department})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="הערות נוספות..."
        className="mt-2"
      />
    </div>
  );
};
