
import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/lib/supabase';
import { DatabaseFormValues, databaseSchema } from './types';

export const useDatabaseConfig = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [databaseType, setDatabaseType] = useState<'supabase' | 'local'>('supabase');
  const [currentConfig, setCurrentConfig] = useState<DatabaseFormValues>({
    databaseType: "supabase",
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    createSchema: false,
  });

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(databaseSchema),
    defaultValues: currentConfig,
  });

  useEffect(() => {
    const fetchDatabaseConfig = async () => {
      setIsLoading(true);
      try {
        // Try to get saved database configuration from system_settings
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'database_config')
          .single();

        if (data && !error) {
          const config = JSON.parse(data.value);
          // Add the createSchema field with default false
          const configWithCreateSchema = {
            ...config,
            createSchema: false,
          };
          setCurrentConfig(configWithCreateSchema);
          setDatabaseType(config.databaseType || 'supabase');
          form.reset(configWithCreateSchema);
        }
      } catch (error) {
        console.error('Error fetching database configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabaseConfig();
  }, [form]);

  // Watch for changes in the form's databaseType field
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'databaseType' && value.databaseType) {
        setDatabaseType(value.databaseType);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  return {
    form,
    databaseType,
    setDatabaseType,
    isLoading,
    setIsLoading,
    currentConfig
  };
};
