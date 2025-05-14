
import React from 'react';
import { Form } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDatabaseConfig } from './database-settings/useDatabaseConfig';
import { useSaveDatabaseConfig } from './database-settings/useSaveDatabaseConfig';
import DatabaseTypeSelector from './database-settings/DatabaseTypeSelector';
import LocalDatabaseForm from './database-settings/LocalDatabaseForm';

const DatabaseSettings: React.FC = () => {
  const { form, databaseType, setDatabaseType, isLoading } = useDatabaseConfig();
  const { handleSubmit, isSubmitting } = useSaveDatabaseConfig(form);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>טוען הגדרות בסיס נתונים...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>הגדרות בסיס נתונים</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <DatabaseTypeSelector 
              form={form} 
              databaseType={databaseType} 
              setDatabaseType={setDatabaseType}
            />
            
            {databaseType === 'local' && (
              <LocalDatabaseForm form={form} isSubmitting={isSubmitting} />
            )}
            
            {databaseType === 'supabase' && (
              <div className="flex justify-end pt-4">
                <p className="text-sm text-gray-600">
                  בסיס הנתונים מוגדר להשתמש בשירות Supabase. 
                  אין צורך בהגדרות נוספות.
                </p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DatabaseSettings;
