
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSaveDatabaseConfig } from './useSaveDatabaseConfig';

const DatabaseSettings: React.FC = () => {
  const { form, isLoading, setIsLoading } = useDatabaseConfig();
  const { saveConfig } = useSaveDatabaseConfig();

  const handleSubmit = form.handleSubmit((values) => {
    saveConfig(values, setIsLoading);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>הגדרות מסד נתונים</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="type">
            <TabsList>
              <TabsTrigger value="type">סוג מסד נתונים</TabsTrigger>
              <TabsTrigger value="connection">הגדרות חיבור</TabsTrigger>
            </TabsList>
            <TabsContent value="type">
              <DatabaseTypeSelector form={form} />
            </TabsContent>
            <TabsContent value="connection">
              <LocalDatabaseForm form={form} />
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end pt-6 mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              שמור הגדרות
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
