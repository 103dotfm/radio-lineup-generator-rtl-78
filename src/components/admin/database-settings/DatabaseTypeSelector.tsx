
import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { DatabaseFormValues } from './types';

interface DatabaseTypeSelectorProps {
  form: UseFormReturn<DatabaseFormValues>;
  databaseType: 'supabase' | 'local';
  setDatabaseType: (type: 'supabase' | 'local') => void;
}

const DatabaseTypeSelector: React.FC<DatabaseTypeSelectorProps> = ({ form, databaseType, setDatabaseType }) => {
  return (
    <FormField
      control={form.control}
      name="databaseType"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>סוג בסיס נתונים</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={(value) => {
                field.onChange(value);
                setDatabaseType(value as 'supabase' | 'local');
              }}
              defaultValue={field.value}
              value={field.value}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="supabase" id="supabase" />
                <Label htmlFor="supabase" className="font-normal mr-2">Supabase (ברירת מחדל)</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="local" id="local" />
                <Label htmlFor="local" className="font-normal mr-2">בסיס נתונים מקומי</Label>
              </div>
            </RadioGroup>
          </FormControl>
          <FormDescription>
            בחר סוג בסיס הנתונים לשימוש באפליקציה
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DatabaseTypeSelector;
