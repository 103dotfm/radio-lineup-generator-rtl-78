
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Worker, getWorkers } from '@/lib/supabase/workers';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';  // Add this import

interface WorkerSelectorProps {
  value: string | null;
  onChange: (value: string | null, fullText?: string) => void;
  additionalText?: string;
  placeholder?: string;
  className?: string;
  department?: string; // Add department prop
}

export const WorkerSelector = ({ 
  value, 
  onChange, 
  additionalText = "", 
  placeholder = "בחר עובד...", 
  className,
  department // Get department prop
}: WorkerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(additionalText || "");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);
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
          const { data: departmentWorkers, error } = await supabase
            .from('workers')
            .select('*')
            .eq('department', department)
            .order('name');
            
          if (error) throw error;
          data = departmentWorkers;
        } else {
          data = await getWorkers();
        }
        
        console.log(`WorkerSelector: Fetched ${data.length} workers`);
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
    setOpen(false);
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
  
  // Filter workers based on search query
  const filteredWorkers = searchQuery 
    ? workers.filter(worker => 
        worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (worker.department && worker.department.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : workers;
  
  return (
    <div className={cn("flex flex-col gap-2", className)} dir="rtl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                טוען עובדים...
              </>
            ) : (
              value && displayValue ? displayValue : placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background" align="start">
          <div className="p-2">
            <Input
              placeholder="חיפוש עובדים..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="mb-2"
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
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
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
        </PopoverContent>
      </Popover>
      
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="הערות נוספות..."
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        dir="rtl"
      />
    </div>
  );
};
