
import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { DatabaseFormValues } from './types';
import { Checkbox } from "@/components/ui/checkbox";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Card, CardContent } from "@/components/ui/card";

interface LocalDatabaseFormProps {
  form: UseFormReturn<DatabaseFormValues>;
}

const LocalDatabaseForm: React.FC<LocalDatabaseFormProps> = ({ form }) => {
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <FormField
        control={form.control}
        name="host"
        render={({ field }) => (
          <FormItem>
            <FormLabel>כתובת שרת</FormLabel>
            <FormControl>
              <Input placeholder="localhost" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="port"
        render={({ field }) => (
          <FormItem>
            <FormLabel>פורט</FormLabel>
            <FormControl>
              <Input placeholder="5432" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="database"
        render={({ field }) => (
          <FormItem>
            <FormLabel>שם בסיס הנתונים</FormLabel>
            <FormControl>
              <Input placeholder="postgres" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>שם משתמש</FormLabel>
            <FormControl>
              <Input placeholder="postgres" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>סיסמה</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="הזן סיסמה" 
                {...field} 
              />
            </FormControl>
            <FormDescription>
              הסיסמה תישמר באופן מוצפן
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="createSchema"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>אתחל סכמת בסיס נתונים</FormLabel>
              <FormDescription>
                השתמש באפשרות זו רק אם זהו בסיס נתונים חדש וריק
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <Card className="bg-blue-50 mt-4">
        <CardContent className="p-4 flex">
          <InfoCircledIcon className="h-5 w-5 text-blue-500 mr-2 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-600">
            אם אתה מגדיר בסיס נתונים חדש, סמן את תיבת הסימון "אתחל סכמת בסיס נתונים". 
            לאחר ההתקנה, תוכל להשתמש בעמוד ייבוא/ייצוא הנתונים כדי לייבא מידע ממערכת קיימת.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocalDatabaseForm;
