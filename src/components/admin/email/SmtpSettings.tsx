
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SmtpSettingsProps {
  settings: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
  };
  onChange: (field: string, value: string | number) => void;
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
        <CardTitle>הגדרות SMTP</CardTitle>
        <CardDescription>
          הגדר את פרטי שרת SMTP לשליחת דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert variant="warning" className="bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">מידע על הגדרות SMTP</AlertTitle>
            <AlertDescription className="text-amber-700">
              <p className="mb-2">לשליחת דואר אלקטרוני דרך שרת SMTP, תצטרך את פרטי ההתחברות לשרת הדואר שלך.</p>
              <p className="mb-2">אם אתה משתמש ב-Gmail, תוכל למצוא הוראות 
                <a href="https://support.google.com/mail/answer/7126229" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> כאן</a>.
              </p>
              <p>אם אתה משתמש ב-Outlook או Office 365, אנא שים לב שייתכן שתצטרך להפעיל אימות SMTP בחשבון שלך.</p>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                dir="ltr"
                placeholder="smtp.gmail.com"
                value={settings.smtp_host}
                onChange={(e) => onChange('smtp_host', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                dir="ltr"
                type="number"
                placeholder="587"
                value={settings.smtp_port}
                onChange={(e) => onChange('smtp_port', parseInt(e.target.value) || 587)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_user">SMTP User</Label>
              <Input
                id="smtp_user"
                dir="ltr"
                placeholder="your-email@gmail.com"
                value={settings.smtp_user}
                onChange={(e) => onChange('smtp_user', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">SMTP Password</Label>
              <Input
                id="smtp_password"
                dir="ltr"
                type="password"
                placeholder="••••••••••••"
                value={settings.smtp_password}
                onChange={(e) => onChange('smtp_password', e.target.value)}
              />
            </div>
          </div>
          
          <Alert className="bg-blue-50">
            <AlertTitle className="text-blue-800">הנחיות אבטחה</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p className="mb-2">אם אתה משתמש ב-Gmail או Google Workspace, סביר שתצטרך להשתמש בסיסמה ייעודית לאפליקציה.</p>
              <p>ניתן ליצור סיסמה ייעודית לאפליקציה ב-
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> הגדרות האבטחה של Google</a>
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSave} 
          disabled={saving}
        >
          {saving ? "שומר..." : "שמור הגדרות"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SmtpSettings;
