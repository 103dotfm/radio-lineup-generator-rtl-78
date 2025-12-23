import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { DatabaseFormValues, dbSchemaSQL } from './types';
import { UseFormReturn } from 'react-hook-form';

export const useSaveDatabaseConfig = (form: UseFormReturn<DatabaseFormValues>) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runDbSchemaScript = async (config: DatabaseFormValues): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/database/schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: dbSchemaSQL }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      return true;
    } catch (error) {
      console.error('Error initializing database schema:', error);
      toast({
        title: "שגיאה ביצירת סכמת בסיס הנתונים",
        description: error instanceof Error ? error.message : "אירעה שגיאה בעת יצירת הטבלאות",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      if (values.databaseType === "local") {
        // Validate local DB fields
        if (!values.host || !values.port || !values.database || !values.username || !values.password) {
          toast({
            title: "שגיאה",
            description: "יש למלא את כל השדות הנדרשים",
            variant: "destructive",
          });
          return;
        }

        // Switch to local database
        const switchResponse = await fetch('/api/admin/database/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'local',
            config: {
              host: values.host,
              port: values.port,
              database: values.database,
              username: values.username,
              password: values.password
            }
          }),
        });

        if (!switchResponse.ok) {
          const errorData = await switchResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to switch database: ${switchResponse.statusText}`);
        }

        // Initialize schema if requested
        if (values.createSchema) {
          const success = await runDbSchemaScript(values);
          if (!success) return;
        }
      } else {
        // Get Supabase URL from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL not configured');
        }

        // Switch to Supabase
        const switchResponse = await fetch('/api/admin/database/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'supabase',
            config: {
              connectionString: supabaseUrl
            }
          }),
        });

        if (!switchResponse.ok) {
          const errorData = await switchResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to switch database: ${switchResponse.statusText}`);
        }
      }

      // Save configuration to system_settings
      const configToSave = { ...values };
      delete configToSave.createSchema;
      delete configToSave.password; // Don't store password in system_settings

      const { error } = await supabase
        .from('system-settings')
        .upsert({
          key: 'database_config',
          value: JSON.stringify(configToSave),
        });

      if (error) throw error;

      toast({
        title: "ההגדרות נשמרו בהצלחה",
        description: values.databaseType === "supabase" 
          ? "התצורה עודכנה להשתמש בבסיס הנתונים של Supabase" 
          : values.createSchema 
            ? "התצורה עודכנה להשתמש בבסיס נתונים מקומי וסכמת הנתונים אותחלה"
            : "התצורה עודכנה להשתמש בבסיס נתונים מקומי",
      });

      // Reload after a short delay to ensure settings are saved
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error saving database configuration:', error);
      toast({
        title: "שגיאה בשמירת ההגדרות",
        description: error instanceof Error ? error.message : "אירעה שגיאה בעת שמירת הגדרות בסיס הנתונים",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return { 
    handleSubmit,
    isSubmitting
  };
};
