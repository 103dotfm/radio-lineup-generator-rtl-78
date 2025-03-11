
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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

const SmtpSettings: React.FC<SmtpSettingsProps> = ({ settings, onChange, onSave, saving }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות SMTP</CardTitle>
        <CardDescription>
          הגדר את פרטי שרת SMTP לשליחת דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">שרת SMTP</Label>
              <Input
                id="smtp_host"
                dir="ltr"
                placeholder="smtp.example.com"
                value={settings.smtp_host}
                onChange={(e) => onChange('smtp_host', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">פורט</Label>
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
              <Label htmlFor="smtp_user">שם משתמש</Label>
              <Input
                id="smtp_user"
                dir="ltr"
                placeholder="user@example.com"
                value={settings.smtp_user}
                onChange={(e) => onChange('smtp_user', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_password">סיסמה</Label>
              <Input
                id="smtp_password"
                dir="ltr"
                type="password"
                placeholder="********"
                value={settings.smtp_password}
                onChange={(e) => onChange('smtp_password', e.target.value)}
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
          {saving ? "שומר..." : "שמור הגדרות"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SmtpSettings;
