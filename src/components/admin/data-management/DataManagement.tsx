
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
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">ניהול נתונים</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            ייצוא וייבוא של נתוני המערכת
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <Tabs defaultValue="export" className="space-y-3 sm:space-y-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 ms-1 sm:ms-2" />
                <span className="truncate">ייצוא נתונים</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                <Upload className="h-3 w-3 sm:h-4 sm:w-4 ms-1 sm:ms-2" />
                <span className="truncate">ייבוא נתונים</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="space-y-3 sm:space-y-4 pt-2">
              <ExportDataTab />
            </TabsContent>
            
            <TabsContent value="import" className="space-y-3 sm:space-y-4 pt-2">
              <ImportDataTab />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-xs sm:text-sm text-gray-500">
            {/* Placeholder for status messages */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DataManagement;
