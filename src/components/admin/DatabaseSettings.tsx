
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

const databaseSchema = z.object({
  databaseType: z.enum(["supabase", "local"]),
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

type DatabaseFormValues = z.infer<typeof databaseSchema>;

const DatabaseSettings: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<DatabaseFormValues>({
    databaseType: "supabase",
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
  });

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(databaseSchema),
    defaultValues: currentConfig,
  });

  // Watch the database type to show/hide local database fields
  const databaseType = form.watch("databaseType");

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
          setCurrentConfig(config);
          form.reset(config);
        }
      } catch (error) {
        console.error('Error fetching database configuration:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabaseConfig();
  }, [form]);

  const onSubmit = async (values: DatabaseFormValues) => {
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
              <FormField
                control={form.control}
                name="databaseType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>סוג בסיס נתונים</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

              {databaseType === "local" && (
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
