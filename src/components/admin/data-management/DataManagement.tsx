
import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExportDataTab from './ExportDataTab';
import ImportDataTab from './ImportDataTab';

const DataManagement = () => {
  const [activeTab, setActiveTab] = useState("export");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ניהול נתונים</CardTitle>
          <CardDescription>
            ייצוא וייבוא של נתוני המערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="export" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">
                <Download className="h-4 w-4 ms-2" />
                ייצוא נתונים
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="h-4 w-4 ms-2" />
                ייבוא נתונים
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="space-y-4">
              <ExportDataTab />
            </TabsContent>
            
            <TabsContent value="import" className="space-y-4">
              <ImportDataTab />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {/* Placeholder for status messages */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DataManagement;
