
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink, Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface GmailSettingsProps {
  settings: {
    gmail_client_id: string;
    gmail_client_secret: string;
    gmail_refresh_token: string;
    gmail_redirect_uri: string;
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
          הגדר את פרטי הגישה ל-Gmail API לשליחת דואר אלקטרוני
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant="warning" className="bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">הוראות להגדרת Gmail API</AlertTitle>
            <AlertDescription className="text-amber-700">
              <ol className="list-decimal list-inside space-y-1">
                <li>צור פרויקט חדש ב-Google Cloud Console</li>
                <li>הפעל את Gmail API</li>
                <li>צור פרטי OAuth מסוג Web Application</li>
                <li>הגדר את כתובת ה-Redirect URI להיות זהה לכתובת שהוזנה כאן</li>
                <li>העתק את Client ID ו-Client Secret ומלא בשדות למטה</li>
                <li>לחץ על "התחבר לחשבון Gmail" כדי לבצע את האימות</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 flex items-center text-blue-600 hover:underline"
              >
                פתח את Google Cloud Console <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gmail_client_id">Client ID</Label>
              <Input
                id="gmail_client_id"
                dir="ltr"
                placeholder="your-client-id.apps.googleusercontent.com"
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
                placeholder="GOCSPX-***********"
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
              placeholder="https://your-site.com/admin"
              value={settings.gmail_redirect_uri}
              onChange={(e) => onChange('gmail_redirect_uri', e.target.value)}
            />
          </div>
          
          <div className="flex justify-between items-center border p-4 rounded-md bg-gray-50">
            <div>
              <p className={`font-medium ${gmailStatus.color}`}>{gmailStatus.message}</p>
              {settings.gmail_refresh_token && (
                <p className="text-sm text-gray-500 mt-1" dir="ltr">
                  Refresh Token: {settings.gmail_refresh_token.substring(0, 5)}...{settings.gmail_refresh_token.substring(settings.gmail_refresh_token.length - 5)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {settings.gmail_refresh_token ? (
                <Button 
                  variant="outline" 
                  onClick={refreshGmailToken}
                  disabled={authorizingGmail}
                  className="flex items-center gap-2"
                >
                  {authorizingGmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  רענן טוקן
                </Button>
              ) : null}
              <Button 
                onClick={initiateGmailAuth}
                disabled={authorizingGmail || !settings.gmail_client_id || !settings.gmail_redirect_uri}
                className="flex items-center gap-2"
              >
                {authorizingGmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="h-4 w-4 flex items-center justify-center bg-white rounded-full">
                    <span className="text-red-500 text-xs font-bold">G</span>
                  </div>
                )}
                התחבר לחשבון Gmail
              </Button>
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

export default GmailSettings;
