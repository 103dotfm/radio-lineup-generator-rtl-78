
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

const DomainSettings = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDomain = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'app_domain')
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error fetching domain setting:', error);
          }
        } else if (data) {
          setDomain(data.value);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchDomain();
  }, []);

  const saveDomain = async () => {
    if (!domain.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין דומיין תקין",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Clean the domain by removing any protocol and trailing slashes
      let cleanDomain = domain.trim();
      cleanDomain = cleanDomain.replace(/^(https?:\/\/)/, '');
      cleanDomain = cleanDomain.replace(/\/$/, '');

      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'app_domain',
          value: cleanDomain,
        }, {
          onConflict: 'key',
          returning: 'minimal',
        });

      if (error) {
        throw error;
      }

      toast({
        title: "הדומיין נשמר בהצלחה",
        description: `הדומיין עודכן ל- ${cleanDomain}`,
      });
      
      setDomain(cleanDomain);
    } catch (error) {
      console.error('Error saving domain:', error);
      toast({
        title: "שגיאה בשמירת הדומיין",
        description: error.message || "אירעה שגיאה בשמירת הדומיין",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full" dir="rtl">
      <CardHeader>
        <CardTitle>הגדרות דומיין</CardTitle>
        <CardDescription>
          הגדר את הדומיין הקבוע של האפליקציה. דומיין זה ישמש ליצירת קישורים בכל רחבי האפליקציה, כולל קישורי אימות אימייל.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">דומיין האפליקציה</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="domain"
                placeholder="app.example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 ml-2"
                disabled={loading || saving}
                dir="ltr"
              />
            </div>
            <p className="text-sm text-gray-500">
              הזן את הדומיין ללא פרוטוקול (http:// או https://)
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-start">
        <Button 
          onClick={saveDomain} 
          disabled={loading || saving || (domain === '' && initialLoad)}
        >
          {saving ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <CheckCircle2 className="ml-2 h-4 w-4" />
              שמור דומיין
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DomainSettings;
