
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SmtpSettingsProps {
  settings: {
    id: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    sender_email: string;
    sender_name: string;
    subject_template: string;
    body_template: string;
    email_method: 'smtp' | 'gmail_api';
    gmail_client_id: string;
    gmail_client_secret: string;
    gmail_refresh_token: string;
    gmail_redirect_uri: string;
    gmail_access_token?: string;
    gmail_token_expiry?: string;
  };
  onChange: (field: string, value: any) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
}

const SmtpSettings: React.FC<SmtpSettingsProps> = ({
  settings,
  onChange,
  onSave,
  saving
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות שרת SMTP</CardTitle>
        <CardDescription>
          הגדר את פרטי התחברות לשרת SMTP לשליחת דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <AlertTitle>הגדרות SMTP</AlertTitle>
            <AlertDescription>
              ודא שאתה מזין את הפרטים הנכונים המתאימים לספק הדואר האלקטרוני שלך. 
              עבור Gmail ו-Outlook, ייתכן שתצטרך להפעיל "גישת אפליקציות פחות מאובטחות" או ליצור סיסמה ייעודית לאפליקציה.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">כתובת שרת SMTP</Label>
              <Input
                id="smtp_host"
                dir="ltr"
                value={settings.smtp_host}
                onChange={(e) => onChange('smtp_host', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">פורט SMTP</Label>
              <Input
                id="smtp_port"
                type="number"
                dir="ltr"
                value={settings.smtp_port}
                onChange={(e) => onChange('smtp_port', parseInt(e.target.value))}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_user">שם משתמש SMTP</Label>
              <Input
                id="smtp_user"
                dir="ltr"
                value={settings.smtp_user}
                onChange={(e) => onChange('smtp_user', e.target.value)}
                placeholder="your-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">סיסמת SMTP</Label>
              <Input
                id="smtp_password"
                type="password"
                dir="ltr"
                value={settings.smtp_password}
                onChange={(e) => onChange('smtp_password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSave} 
          disabled={saving}
        >
          {saving ? "שומר..." : "שמור הגדרות SMTP"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SmtpSettings;
