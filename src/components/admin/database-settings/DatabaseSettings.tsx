
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

const DatabaseSettings: React.FC = () => {
  const { data: config, isLoading } = useDatabaseConfig();

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
        <DatabaseTypeSelector currentType={config?.type || 'supabase'} />
        <Separator className="my-4" />
        <LocalDatabaseForm defaultValues={config} />
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
