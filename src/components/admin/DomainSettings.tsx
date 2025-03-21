
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DomainSettings = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
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

  // Validate domain format
  const validateDomain = (domain: string): boolean => {
    // Clear existing validation errors
    setValidationError(null);
    
    const domainValue = domain.trim();
    
    // Don't validate empty domains
    if (!domainValue) {
      return false;
    }
    
    // Remove any protocol prefixes for validation
    const cleanDomain = domainValue.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');
    
    // Simple domain validation regex
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(cleanDomain)) {
      setValidationError("אנא הזן דומיין תקין (לדוגמה: myapp.example.com)");
      return false;
    }
    
    return true;
  };

  const saveDomain = async () => {
    // Validate the domain before saving
    if (!validateDomain(domain)) {
      if (!validationError) {
        setValidationError("נא להזין דומיין תקין");
      }
      return;
    }

    setSaving(true);
    try {
      // Clean the domain by removing any protocol and trailing slashes
      let cleanDomain = domain.trim();
      cleanDomain = cleanDomain.replace(/^(https?:\/\/)/, '');
      cleanDomain = cleanDomain.replace(/\/$/, '');

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'app_domain',
          value: cleanDomain,
        }, {
          onConflict: 'key',
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
          הגדר את הדומיין הקבוע של האפליקציה. דומיין זה ישמש ליצירת קישורים בכל רחבי האפליקציה, כולל קישורי אימות אימייל ולינקים בליינאפים.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">דומיין האפליקציה</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="domain"
                placeholder="myapp.example.com"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  // Clear validation errors when user types
                  if (validationError) {
                    setValidationError(null);
                  }
                }}
                className="flex-1 ml-2"
                disabled={loading || saving}
                dir="ltr"
              />
            </div>
            <p className="text-sm text-gray-500">
              הזן את הדומיין ללא פרוטוקול (http:// או https://)
            </p>
            
            {validationError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validationError}
                </AlertDescription>
              </Alert>
            )}
            
            <Alert className="mt-4">
              <AlertDescription>
                <p className="font-medium">הגדרת דומיין מותאם אישית:</p>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>הפנה את הדומיין שלך ל-IP של השרת הנוכחי או לשם המארח שלנו</li>
                  <li>אם אתה משתמש ב-Cloudflare, ודא שאתה מגדיר DNS only (Proxy status: DNS only, ענן אפור)</li>
                  <li>אם אתה מקבל שגיאת "DNS points to prohibited IP", בדוק שאתה לא מפנה לכתובת IP פרטית</li>
                  <li>הפנה את הדומיין לא ישירות לכתובת IP אלא לשם המארח של השרת</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-start">
        <Button 
          onClick={saveDomain} 
          disabled={loading || saving || (domain === '' && initialLoad) || !!validationError}
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
