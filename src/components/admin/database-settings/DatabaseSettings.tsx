
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';

const DatabaseSettings: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>הגדרות מסד נתונים</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="type">
          <TabsList>
            <TabsTrigger value="type">סוג מסד נתונים</TabsTrigger>
            <TabsTrigger value="connection">הגדרות חיבור</TabsTrigger>
          </TabsList>
          <TabsContent value="type">
            <DatabaseTypeSelector />
          </TabsContent>
          <TabsContent value="connection">
            <LocalDatabaseForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
