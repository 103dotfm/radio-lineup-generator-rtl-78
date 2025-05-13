
import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { DatabaseFormValues } from './types';
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LocalDatabaseFormProps {
  form: UseFormReturn<DatabaseFormValues>;
  isSubmitting: boolean;
}

const LocalDatabaseForm: React.FC<LocalDatabaseFormProps> = ({ form, isSubmitting }) => {
  return (
    <div className="space-y-4 p-2 sm:p-4 border rounded-md">
      <FormField
        control={form.control}
        name="host"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">כתובת שרת</FormLabel>
            <FormControl>
              <Input placeholder="localhost" className="h-10 sm:h-9" {...field} />
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
            <FormLabel className="text-base font-medium">פורט</FormLabel>
            <FormControl>
              <Input placeholder="5432" className="h-10 sm:h-9" {...field} />
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
            <FormLabel className="text-base font-medium">שם בסיס הנתונים</FormLabel>
            <FormControl>
              <Input placeholder="postgres" className="h-10 sm:h-9" {...field} />
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
            <FormLabel className="text-base font-medium">שם משתמש</FormLabel>
            <FormControl>
              <Input placeholder="postgres" className="h-10 sm:h-9" {...field} />
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
            <FormLabel className="text-base font-medium">סיסמה</FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder="הזן סיסמה" 
                className="h-10 sm:h-9"
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-xs sm:text-sm">
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
          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 rounded-md border p-3 sm:p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-base font-medium">אתחל סכמת בסיס נתונים</FormLabel>
              <FormDescription className="text-xs sm:text-sm">
                השתמש באפשרות זו רק אם זהו בסיס נתונים חדש וריק
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      <Card className="bg-blue-50 mt-4">
        <CardContent className="p-3 sm:p-4 flex items-start">
          <Info className="h-5 w-5 text-blue-500 ml-2 mr-0 sm:mr-2 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-blue-600">
            אם אתה מגדיר בסיס נתונים חדש, סמן את תיבת הסימון "אתחל סכמת בסיס נתונים". 
            לאחר ההתקנה, תוכל להשתמש בעמוד ייבוא/ייצוא הנתונים כדי לייבא מידע ממערכת קיימת.
          </p>
        </CardContent>
      </Card>
      
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
};

export default LocalDatabaseForm;
