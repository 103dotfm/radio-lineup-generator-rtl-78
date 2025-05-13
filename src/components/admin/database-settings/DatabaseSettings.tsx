
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSaveDatabaseConfig } from './useSaveDatabaseConfig';

const DatabaseSettings: React.FC = () => {
  const { form, isLoading, setIsLoading, currentConfig } = useDatabaseConfig();
  const { saveConfig } = useSaveDatabaseConfig();

  const handleSubmit = form.handleSubmit((values) => {
    saveConfig(values, setIsLoading);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>הגדרות מסד נתונים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DatabaseTypeSelector form={form} />
          <Separator className="my-4" />
          <LocalDatabaseForm form={form} />
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              שמור הגדרות
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
