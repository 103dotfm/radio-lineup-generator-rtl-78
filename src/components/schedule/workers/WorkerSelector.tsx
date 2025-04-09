
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Worker, getWorkers } from '@/lib/supabase/workers';
import { Input } from '@/components/ui/input';

interface WorkerSelectorProps {
  value: string | null;
  onChange: (value: string | null, fullText?: string) => void;
  additionalText?: string;
  placeholder?: string;
  className?: string;
}

export const WorkerSelector = ({ 
  value, 
  onChange, 
  additionalText = "", 
  placeholder = "בחר עובד...", 
  className 
}: WorkerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(additionalText || "");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Find the selected worker name
  const selectedWorker = workers.find(worker => worker.id === value);
  const displayValue = selectedWorker ? selectedWorker.name : "";
  
  // Fetch workers from database
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        console.log('WorkerSelector: Fetching workers');
        const data = await getWorkers();
        console.log('WorkerSelector: Fetched workers:', data);
        setWorkers(data || []);
      } catch (error) {
        console.error('Error fetching workers:', error);
        // Ensure workers is always an array even on error
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkers();
  }, []);
  
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
          >
            {value && displayValue ? displayValue : placeholder}
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
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-2 text-center text-muted-foreground">טוען עובדים...</div>
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
