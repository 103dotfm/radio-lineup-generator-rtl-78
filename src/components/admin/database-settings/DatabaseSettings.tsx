
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import DatabaseTypeSelector from './DatabaseTypeSelector';
import LocalDatabaseForm from './LocalDatabaseForm';
import { useDatabaseConfig } from './useDatabaseConfig';
import { useSaveDatabaseConfig } from './useSaveDatabaseConfig';
import { AlertCircle } from 'lucide-react';

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
          {databaseType === "local" && (
            <div className="mb-6 p-4 bg-amber-50 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 ms-2" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">חשוב לדעת בעת שימוש בבסיס נתונים מקומי</h4>
                <p className="text-sm text-amber-700 mt-1">
                  אם אתה מחבר בסיס נתונים ריק, סמן את אפשרות "אתחל סכמת בסיס נתונים" כדי ליצור את כל הטבלאות הנדרשות.
                  לאחר ההתקנה, תוכל לייבא נתונים מגיבוי קיים בעמוד ייבוא/ייצוא הנתונים.
                </p>
              </div>
            </div>
          )}

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
