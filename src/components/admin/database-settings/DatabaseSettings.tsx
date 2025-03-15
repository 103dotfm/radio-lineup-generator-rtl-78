
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { useSaveDatabaseConfig } from './useSaveDatabaseConfig';

const DatabaseSettings: React.FC = () => {
  const { form, isLoading, setIsLoading } = useDatabaseConfig();
  const { saveConfig } = useSaveDatabaseConfig();
  
  // Watch the database type to show/hide local database fields
  const databaseType = form.watch("databaseType");

  const onSubmit = async (values: any) => {
    await saveConfig(values, setIsLoading);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>הגדרות בסיס נתונים</CardTitle>
          <CardDescription>
            הגדר את סוג בסיס הנתונים שברצונך להשתמש בו עבור האפליקציה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <DatabaseTypeSelector form={form} />

              {databaseType === "local" && (
                <LocalDatabaseForm form={form} />
              )}

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "שומר..." : "שמור הגדרות"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseSettings;
