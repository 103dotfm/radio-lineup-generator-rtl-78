
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, RefreshCw } from "lucide-react";

interface GmailSettingsProps {
  settings: {
    gmail_client_id: string;
    gmail_client_secret: string;
    gmail_redirect_uri: string;
    gmail_refresh_token?: string;
    gmail_access_token?: string;
    gmail_token_expiry?: string;
  };
  onChange: (field: string, value: string) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  gmailStatus: {
    status: string;
    message: string;
    color: string;
  };
  authorizingGmail: boolean;
  initiateGmailAuth: () => void;
  refreshGmailToken: () => Promise<void>;
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
        <CardTitle>הגדרות Gmail API</CardTitle>
        <CardDescription>
          הגדר את פרטי החיבור לממשק API של Gmail
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gmail_client_id">Client ID</Label>
              <Input
                id="gmail_client_id"
                dir="ltr"
                value={settings.gmail_client_id}
                onChange={(e) => onChange('gmail_client_id', e.target.value)}
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
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gmail_redirect_uri">Redirect URI</Label>
            <Input
              id="gmail_redirect_uri"
              dir="ltr"
              value={settings.gmail_redirect_uri}
              onChange={(e) => onChange('gmail_redirect_uri', e.target.value)}
              placeholder="https://example.com/admin"
            />
            <p className="text-sm text-muted-foreground mt-1">
              כתובת זו חייבת להיות מוגדרת גם בפרוייקט Google Cloud שלך
            </p>
          </div>
          
          <Alert>
            <AlertTitle>סטטוס חיבור Gmail</AlertTitle>
            <AlertDescription>
              <div className={gmailStatus.color}>
                {gmailStatus.message}
              </div>
              
              {settings.gmail_refresh_token && (
                <div className="mt-2">
                  <Button 
                    onClick={refreshGmailToken} 
                    variant="outline" 
                    size="sm"
                    disabled={authorizingGmail}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    רענן טוקן
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
          
          <Alert>
            <AlertTitle>יצירת פרוייקט Google Cloud</AlertTitle>
            <AlertDescription>
              <p className="mb-2">על מנת להשתמש בממשק API של Gmail, עליך ליצור פרוייקט ב-Google Cloud Platform:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>היכנס <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center inline">למסוף Google Cloud <ExternalLink className="h-3 w-3 ml-1 inline" /></a></li>
                <li>צור פרוייקט חדש</li>
                <li>הפעל את Gmail API</li>
                <li>צור פרטי התחברות OAuth</li>
                <li>הגדר את כתובת ה-Redirect כפי שמופיעה כאן</li>
                <li>העתק את Client ID ו-Client Secret לכאן</li>
              </ol>
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
        
        <Button 
          onClick={initiateGmailAuth} 
          variant="outline" 
          disabled={authorizingGmail || !settings.gmail_client_id || !settings.gmail_redirect_uri}
          className="flex items-center gap-2"
        >
          {authorizingGmail ? "מאמת..." : "התחבר ל-Gmail"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GmailSettings;
