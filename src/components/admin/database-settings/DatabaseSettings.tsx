
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { useSaveDatabaseConfig } from './useSaveDatabaseConfig';

const DatabaseSettings: React.FC = () => {
  const { 
    form,
    databaseType, 
    setDatabaseType, 
    isLoading 
  } = useDatabaseConfig();

  const { 
    handleSubmit, 
    isSubmitting
  } = useSaveDatabaseConfig(form);

  if (isLoading) {
    return <div>Loading database settings...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>הגדרות בסיס נתונים</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <DatabaseTypeSelector 
            databaseType={databaseType} 
            setDatabaseType={setDatabaseType}
            form={form}
          />
          
          {databaseType === 'local' && (
            <LocalDatabaseForm 
              isSubmitting={isSubmitting}
              form={form}
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
