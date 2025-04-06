
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DigitalWorkArrangementEditor from './DigitalWorkArrangementEditor';
import { format, startOfWeek } from 'date-fns';

const DigitalWorkArrangement = () => {
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    return format(weekStart, 'yyyy-MM-dd');
  });

  const handleSelectWeek = (weekStart: string) => {
    setSelectedWeekStart(weekStart);
  };

  return (
    <div className="space-y-6">
      <DigitalWorkArrangementEditor 
        selectedWeekStart={selectedWeekStart}
        onSelectWeek={handleSelectWeek}
      />
    </div>
  );
};

export default DigitalWorkArrangement;
