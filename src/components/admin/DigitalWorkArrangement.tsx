
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DigitalWorkersTable from './digital-workers/DigitalWorkersTable';

const DigitalWorkArrangement = () => {
  const [activeTab, setActiveTab] = useState('workers');

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>סידור עבודה - דיגיטל</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workers">עובדי דיגיטל</TabsTrigger>
              <TabsTrigger value="schedule">לוח משמרות</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workers">
              <DigitalWorkersTable />
            </TabsContent>
            
            <TabsContent value="schedule">
              <div className="text-center py-8">
                תכנון לוח משמרות יופיע כאן
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalWorkArrangement;
