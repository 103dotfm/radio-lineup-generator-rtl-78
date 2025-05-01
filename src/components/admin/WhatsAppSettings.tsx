import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/lib/supabase';
import { CardContent, CardFooter, Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatWhatsAppNumber } from '@/lib/supabase';
import { WhatsAppSettings as WhatsAppSettingsType, getWhatsAppSettings, saveWhatsAppSettings } from '@/lib/whatsapp';

interface WhatsAppSettings {
  id: string;
  whatsapp_enabled: boolean;
  whatsapp_api_type: string;
  whatsapp_group_id: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  whatsapp_api_key?: string;
}

const WhatsAppSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [settings, setSettings] = useState<WhatsAppSettingsType>({
    id: '',
    whatsapp_enabled: false,
    whatsapp_api_type: 'twilio',
    whatsapp_group_id: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    whatsapp_api_key: '',
  });

  const [testNumber, setTestNumber] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getWhatsAppSettings();
        
      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה בטעינת הגדרות',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Format phone numbers properly
      const formattedSettings = {
        ...settings,
        whatsapp_group_id: formatWhatsAppNumber(settings.whatsapp_group_id),
        twilio_phone_number: settings.twilio_phone_number ? 
          formatWhatsAppNumber(settings.twilio_phone_number) : settings.twilio_phone_number
      };

      const result = await saveWhatsAppSettings(formattedSettings);
      
      if (!result.success) {
        throw result.error;
      }

      toast({
        title: 'ההגדרות נשמרו בהצלחה',
        description: 'הגדרות הווטסאפ עודכנו',
      });

      loadSettings();
    } catch (error: any) {
      toast({
        title: 'שגיאה בשמירת הגדרות',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testWhatsApp = async () => {
    setIsTesting(true);
    try {
      const number = formatWhatsAppNumber(testNumber || settings.whatsapp_group_id);
      
      if (!number) {
        throw new Error('יש להזין מספר טלפון לבדיקה');
      }

      const { data, error } = await supabase.functions.invoke("send-lineup-email", {
        body: { 
          testWhatsApp: true,
          testNumber: number,
          showId: "test", // This is a test, so we use a placeholder ID
          skipEmail: true // Don't send an email during the test
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'הודעת בדיקה נשלחה',
        description: 'נשלחה הודעת בדיקה לווטסאפ',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה בשליחת הודעת בדיקה',
        description: error.message || 'אירעה שגיאה בלתי צפויה',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>הגדרות WhatsApp</CardTitle>
        <CardDescription>
          הגדר את אופן שליחת הודעות ליינאפ באמצעות WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="whatsapp_enabled">הפעל שליחת הודעות WhatsApp</Label>
          <Switch
            id="whatsapp_enabled"
            name="whatsapp_enabled"
            checked={settings.whatsapp_enabled}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, whatsapp_enabled: checked }))
            }
            disabled={isLoading || isSaving}
          />
        </div>

        {settings.whatsapp_enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_api_type">סוג API</Label>
              <RadioGroup
                value={settings.whatsapp_api_type}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, whatsapp_api_type: value }))
                }
                disabled={isLoading || isSaving}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="twilio" id="twilio" />
                  <Label htmlFor="twilio">Twilio</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="whatsapp_business" id="whatsapp_business" />
                  <Label htmlFor="whatsapp_business">WhatsApp Business API</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_group_id">מספר קבוצת WhatsApp / מספר נמען</Label>
              <Input
                id="whatsapp_group_id"
                name="whatsapp_group_id"
                placeholder="+972501234567"
                value={settings.whatsapp_group_id}
                onChange={handleInputChange}
                disabled={isLoading || isSaving}
                className="text-left ltr"
              />
              <p className="text-sm text-muted-foreground">
                יש להזין את מספר הטלפון המלא כולל קידומת המדינה (לדוגמה: +972501234567)
              </p>
            </div>

            {settings.whatsapp_api_type === 'twilio' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="twilio_account_sid">Twilio Account SID</Label>
                  <Input
                    id="twilio_account_sid"
                    name="twilio_account_sid"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.twilio_account_sid}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    className="text-left ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilio_auth_token">Twilio Auth Token</Label>
                  <Input
                    id="twilio_auth_token"
                    name="twilio_auth_token"
                    type="password"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.twilio_auth_token}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    className="text-left ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twilio_phone_number">Twilio Phone Number (WhatsApp)</Label>
                  <Input
                    id="twilio_phone_number"
                    name="twilio_phone_number"
                    placeholder="+14155238886"
                    value={settings.twilio_phone_number}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    className="text-left ltr"
                  />
                  <p className="text-sm text-muted-foreground">
                    מספר הטלפון שמקושר לחשבון ה-WhatsApp שלך בטוויליו (כולל קידומת המדינה)
                  </p>
                </div>
              </>
            )}

            {settings.whatsapp_api_type === 'whatsapp_business' && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp_api_key">WhatsApp Business API Key</Label>
                <Input
                  id="whatsapp_api_key"
                  name="whatsapp_api_key"
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.whatsapp_api_key}
                  onChange={handleInputChange}
                  disabled={isLoading || isSaving}
                  className="text-left ltr"
                />
              </div>
            )}
            
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="test_number">בדיקת שליחת הודעה</Label>
              <div className="flex space-x-2 space-x-reverse">
                <Input
                  id="test_number"
                  placeholder="+972501234567"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  disabled={isTesting || isSaving}
                  className="text-left ltr"
                />
                <Button onClick={testWhatsApp} disabled={isTesting || isSaving}>
                  {isTesting ? 'שולח...' : 'שלח הודעת בדיקה'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                השאר ריק לשימוש במספר הקבוצה שהוגדר למעלה
              </p>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={saveSettings} disabled={isLoading || isSaving || isTesting}>
          {isSaving ? 'שומר...' : 'שמור הגדרות'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppSettings;
