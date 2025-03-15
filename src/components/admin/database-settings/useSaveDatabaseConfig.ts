
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { DatabaseFormValues, dbSchemaSQL } from './types';

export const useSaveDatabaseConfig = () => {
  const { toast } = useToast();

  const runDbSchemaScript = async (config: DatabaseFormValues): Promise<boolean> => {
    try {
      // Construct a PostgreSQL connection string
      const connectionString = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
      
      // Call a server-side function to run the SQL (this would need to be implemented)
      const { data, error } = await supabase.functions.invoke('execute-sql', {
        body: { 
          connectionString,
          sql: dbSchemaSQL
        }
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error initializing database schema:', error);
      toast({
        title: "שגיאה ביצירת סכמת בסיס הנתונים",
        description: "אירעה שגיאה בעת יצירת הטבלאות. ראה את לוג המערכת לפרטים נוספים.",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveConfig = async (values: DatabaseFormValues, setIsLoading: (value: boolean) => void) => {
    setIsLoading(true);
    try {
      if (values.databaseType === "local") {
        // Validate that all required fields are filled for local DB
        if (!values.host || !values.port || !values.database || !values.username) {
          toast({
            title: "שגיאה",
            description: "יש למלא את כל השדות הנדרשים",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // If createSchema is true and this is a local DB, initialize it
        if (values.createSchema) {
          const success = await runDbSchemaScript(values);
          if (!success) {
            setIsLoading(false);
            return;
          }
        }
      }

      // Remove createSchema before saving to system_settings
      const configToSave = { ...values };
      delete configToSave.createSchema;

      // Save the configuration to system_settings
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'database_config',
          value: JSON.stringify(configToSave),
        });

      if (error) {
        throw error;
      }

      toast({
        title: "ההגדרות נשמרו בהצלחה",
        description: values.databaseType === "supabase" 
          ? "התצורה עודכנה להשתמש בבסיס הנתונים של Supabase" 
          : values.createSchema 
            ? "התצורה עודכנה להשתמש בבסיס נתונים מקומי וסכמת הנתונים אותחלה"
            : "התצורה עודכנה להשתמש בבסיס נתונים מקומי",
      });
    } catch (error) {
      console.error('Error saving database configuration:', error);
      toast({
        title: "שגיאה בשמירת ההגדרות",
        description: "אירעה שגיאה בעת שמירת הגדרות בסיס הנתונים",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { saveConfig };
};
