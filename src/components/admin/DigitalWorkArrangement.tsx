
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DigitalWorkArrangementEditor from './DigitalWorkArrangementEditor';
import WorkerManagementTab from './workers/WorkerManagementTab';

const DigitalWorkArrangement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("schedule");

  useEffect(() => {
    return () => {
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">ניהול סידורי עבודה דיגיטל</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="schedule">עריכת סידור עבודה</TabsTrigger>
          <TabsTrigger value="workers">צוות עובדים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule">
          <DigitalWorkArrangementEditor />
        </TabsContent>
        
        <TabsContent value="workers">
          <WorkerManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalWorkArrangement;
