
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface Worker {
  id: string;
  name: string;
}

interface WorkerSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

const WorkerSelector: React.FC<WorkerSelectorProps> = ({
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch workers on component mount
  useEffect(() => {
    fetchWorkers();
  }, []);

  // Get selected worker when value changes
  useEffect(() => {
    if (value) {
      // Find worker with matching ID
      const worker = workers.find(w => w.id === value);
      if (worker) {
        setSelectedWorker(worker);
      } else if (workers.length > 0) {
        // Try to find by name (backward compatibility)
        const workerByName = workers.find(w => w.name === value);
        if (workerByName) {
          setSelectedWorker(workerByName);
        } else {
          // Handle case where value is not an ID but a direct name
          setSelectedWorker({ id: value, name: value });
        }
      }
    } else {
      setSelectedWorker(null);
    }
  }, [value, workers]);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setWorkers(data || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      toast({
        title: 'שגיאה בטעינת רשימת העובדים',
        description: 'אירעה שגיאה בעת טעינת רשימת העובדים',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    onChange(worker.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorker(null);
    onChange(null);
  };

  const handleAddWorker = async () => {
    // Only add worker if search query is not empty
    if (!searchQuery.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('workers')
        .insert([{ name: searchQuery.trim() }])
        .select('*')
        .single();
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'עובד חדש נוסף',
        description: `עובד "${data.name}" נוסף בהצלחה`,
      });
      
      setWorkers(prev => [...prev, data]);
      handleSelectWorker(data);
    } catch (error) {
      console.error('Error adding worker:', error);
      toast({
        title: 'שגיאה בהוספת עובד',
        description: 'אירעה שגיאה בעת הוספת עובד חדש',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="worker-selector relative" dir="rtl">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            {selectedWorker ? (
              <div className="flex items-center justify-between w-full">
                <span>{selectedWorker.name}</span>
                <X 
                  className="h-4 w-4 hover:text-red-500 cursor-pointer" 
                  onClick={handleClearSelection}
                />
              </div>
            ) : (
              <span className="text-muted-foreground">בחר עובד</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="worker-selector-dropdown w-full p-0 bg-white" style={{ zIndex: 9999 }}>
          <div className="flex items-center border-b p-2">
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="חפש או הוסף עובד..."
              className="flex-1 bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredWorkers.length === 0 && searchQuery) {
                  handleAddWorker();
                }
              }}
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredWorkers.length > 0 ? (
              <div className="worker-selector-items py-2">
                {filteredWorkers.map(worker => (
                  <button
                    key={worker.id}
                    className="w-full text-right px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleSelectWorker(worker)}
                  >
                    {worker.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm">
                {searchQuery ? (
                  <div className="space-y-2">
                    <p>לא נמצאו תוצאות עבור "{searchQuery}"</p>
                    <Button size="sm" variant="outline" onClick={handleAddWorker}>
                      הוסף עובד חדש: {searchQuery}
                    </Button>
                  </div>
                ) : (
                  <p>אין עובדים ברשימה</p>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default WorkerSelector;
