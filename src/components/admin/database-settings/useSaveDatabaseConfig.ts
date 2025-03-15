
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { DatabaseFormValues } from './types';

export const useSaveDatabaseConfig = () => {
  const { toast } = useToast();

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
      }

      // Save the configuration to system_settings
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'database_config',
          value: JSON.stringify(values),
        });

      if (error) {
        throw error;
      }

      toast({
        title: "ההגדרות נשמרו בהצלחה",
        description: values.databaseType === "supabase" 
          ? "התצורה עודכנה להשתמש בבסיס הנתונים של Supabase" 
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
