
import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { DatabaseFormValues } from './types';

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
    </div>
  );
};

export default LocalDatabaseForm;
