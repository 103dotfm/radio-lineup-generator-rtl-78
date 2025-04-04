
import React, { useState, useEffect, useRef } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWorkers } from '@/lib/supabase/workers';

export interface Worker {
  id: string;
  name: string;
  department?: string;
  position?: string;
}

interface WorkerSelectorProps {
  value: string | null;
  onChange: (value: string | null, fullText?: string) => void;
  additionalText?: string;
  placeholder?: string;
  className?: string;
}

const WorkerSelector = ({ value, onChange, additionalText = "", placeholder = "בחר עובד...", className }: WorkerSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(additionalText || "");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Find the selected worker name
  const selectedWorker = workers.find(worker => worker.id === value);
  const displayValue = selectedWorker ? selectedWorker.name : value;
  
  // Fetch workers from database
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const data = await getWorkers();
        setWorkers(data);
      } catch (error) {
        console.error('Error fetching workers:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkers();
  }, []);
  
  const handleSelect = (currentValue: string) => {
    // Toggle selection if clicking the same item
    const newValue = value === currentValue ? null : currentValue;
    onChange(newValue, inputValue);
    setOpen(false);
    
    // Focus the input after selection for additional text
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(value, e.target.value);
  };
  
  return (
    <div className={cn("flex items-center space-x-2 space-x-reverse gap-2", className)} dir="rtl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-bold"
          >
            {value ? displayValue : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command dir="rtl">
            <CommandInput placeholder="חיפוש עובדים..." />
            <CommandEmpty>לא נמצאו עובדים</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {loading ? (
                <CommandItem disabled>טוען עובדים...</CommandItem>
              ) : (
                workers.map((worker) => (
                  <CommandItem
                    key={worker.id}
                    value={worker.name}
                    onSelect={() => handleSelect(worker.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === worker.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {worker.name}
                    {worker.department && <span className="text-gray-500 text-sm mr-2">({worker.department})</span>}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      <input
        type="text"
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        placeholder="הערות נוספות..."
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-normal text-sm"
        dir="rtl"
      />
    </div>
  );
};

export default WorkerSelector;
