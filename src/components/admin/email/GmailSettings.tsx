
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Check, RefreshCw, ExternalLink } from "lucide-react";

interface GmailSettingsProps {
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
  gmailStatus: {
    status: string;
    message: string;
    color: string;
  };
  authorizingGmail: boolean;
  initiateGmailAuth: () => void;
  refreshGmailToken: () => void;
}

const GmailSettings: React.FC<GmailSettingsProps> = ({
  settings,
  onChange,
  onSave,
  saving,
  gmailStatus,
  authorizingGmail,
  initiateGmailAuth,
  refreshGmailToken
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>הגדרות API של Gmail</CardTitle>
        <CardDescription>
          הגדר פרטי התחברות לממשק API של Gmail לשליחת דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <AlertTitle>סטטוס חיבור לחשבון Gmail</AlertTitle>
            <AlertDescription>
              <p className={gmailStatus.color}>{gmailStatus.message}</p>
              
              {gmailStatus.status === 'authenticated' && (
                <Badge variant="outline" className="mt-2 bg-green-500 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  מחובר
                </Badge>
              )}
              
              {gmailStatus.status === 'expired' && (
                <Badge variant="outline" className="mt-2 bg-amber-500 text-white">
                  הטוקן פג תוקף
                </Badge>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gmail_client_id">Client ID</Label>
              <Input
                id="gmail_client_id"
                dir="ltr"
                value={settings.gmail_client_id}
                onChange={(e) => onChange('gmail_client_id', e.target.value)}
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmail_client_secret">Client Secret</Label>
              <Input
                id="gmail_client_secret"
                dir="ltr"
                type="password"
                value={settings.gmail_client_secret}
                onChange={(e) => onChange('gmail_client_secret', e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="gmail_redirect_uri">Redirect URI</Label>
              <Input
                id="gmail_redirect_uri"
                dir="ltr"
                value={settings.gmail_redirect_uri}
                onChange={(e) => onChange('gmail_redirect_uri', e.target.value)}
                placeholder="https://yourapp.com/admin"
              />
              <p className="text-sm text-muted-foreground mt-1">
                כתובת חזרה זו חייבת להיות מוגדרת גם במסך OAuth שלך בפרויקט Google Cloud
              </p>
            </div>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTitle className="text-blue-800">הוראות הגדרה</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ol className="list-decimal list-inside space-y-1">
                <li>צור פרויקט ב-Google Cloud Console</li>
                <li>הפעל את ממשק Gmail API</li>
                <li>הגדר אישורי OAuth וספק כתובת חזרה (כתובת האתר שלך + "/admin")</li>
                <li>העתק את Client ID וClient Secret לשדות למעלה</li>
                <li>לחץ על "שמור הגדרות" לפני שתמשיך</li>
              </ol>
              <a 
                href="https://developers.google.com/gmail/api/quickstart/js" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:underline mt-2"
              >
                למידע נוסף <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={onSave} 
          disabled={saving}
        >
          {saving ? "שומר..." : "שמור הגדרות"}
        </Button>
        
        <div className="flex gap-2">
          {gmailStatus.status === 'expired' && (
            <Button 
              onClick={refreshGmailToken}
              disabled={authorizingGmail}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {authorizingGmail ? "מרענן..." : "רענן טוקן"}
            </Button>
          )}
          
          <Button 
            onClick={initiateGmailAuth}
            disabled={authorizingGmail}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {authorizingGmail ? "מתחבר..." : "התחבר לחשבון Gmail"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default GmailSettings;
