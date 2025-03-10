
import React, { useState, useEffect } from 'react';
import UserManagement from '@/components/admin/UserManagement';
import MasterSchedule from '@/components/schedule/MasterSchedule';
import WorkArrangements from '@/components/admin/WorkArrangements';
import EmailSettings from '@/components/admin/EmailSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

const Admin = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [savingOffset, setSavingOffset] = useState(false);
  const [redirectProcessed, setRedirectProcessed] = useState(false);
  const [defaultTab, setDefaultTab] = useState("schedule");

  // Check for OAuth code in the URL
  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && !redirectProcessed) {
      console.log("Found OAuth code in URL, setting default tab to email");
      setDefaultTab("email");
      setRedirectProcessed(true);
      
      // Remove the code from the URL without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams, redirectProcessed]);

  useEffect(() => {
    // Fetch current server time and timezone offset
    const fetchServerSettings = async () => {
      try {
        // Check if system_settings table exists by attempting to query it
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'timezone_offset')
          .single();

        if (!settingsError && settingsData) {
          setTimezoneOffset(parseInt(settingsData.value) || 0);
        } else {
          console.warn("Could not fetch timezone offset, defaulting to 0:", settingsError);
        }

        // Get server time
        const now = new Date();
        setServerTime(now);
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };

    fetchServerSettings();
    // Update server time every minute
    const interval = setInterval(() => {
      setServerTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const saveTimezoneOffset = async () => {
    try {
      setSavingOffset(true);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'timezone_offset',
          value: timezoneOffset.toString()
        });

      if (error) throw error;
      
      toast({
        title: "הגדרות אזור זמן נשמרו בהצלחה",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error saving timezone offset:', error);
      toast({
        title: "שגיאה בשמירת הגדרות אזור זמן",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingOffset(false);
    }
  };

  const formatLocalTime = (date: Date | null) => {
    if (!date) return '';
    
    // Apply the offset to display the "server time with offset"
    const offsetDate = new Date(date.getTime());
    offsetDate.setHours(offsetDate.getHours() + timezoneOffset);
    
    return offsetDate.toLocaleTimeString('he-IL');
  };

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but not admin, redirect to home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">ניהול מערכת</h1>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה ללוח הבקרה
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5" />
            הגדרות זמן מערכת
          </CardTitle>
          <CardDescription>
            כוונון אזור זמן לשליחת הודעות דואר אלקטרוני
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6">
            <div className="space-y-2 flex-1">
              <Label htmlFor="server-time">זמן שרת נוכחי:</Label>
              <div className="text-lg font-medium" id="server-time">
                {serverTime ? serverTime.toLocaleTimeString('he-IL') : 'טוען...'}
              </div>
            </div>
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="server-time-offset">זמן שרת עם היסט:</Label>
              <div className="text-lg font-medium text-green-600" id="server-time-offset">
                {serverTime ? formatLocalTime(serverTime) : 'טוען...'}
              </div>
            </div>
            
            <div className="space-y-2 flex-1">
              <Label htmlFor="timezone-offset">היסט שעות (מספר שלם):</Label>
              <div className="flex gap-2">
                <Input 
                  id="timezone-offset"
                  type="number"
                  value={timezoneOffset}
                  onChange={(e) => setTimezoneOffset(parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <Button 
                  onClick={saveTimezoneOffset}
                  disabled={savingOffset}
                >
                  {savingOffset ? "שומר..." : "שמור היסט"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="schedule">לוח שידורים ראשי</TabsTrigger>
          <TabsTrigger value="arrangements">סידורי עבודה</TabsTrigger>
          <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
          <TabsTrigger value="email">דואר אלקטרוני</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="mt-4">
          <MasterSchedule />
        </TabsContent>
        
        <TabsContent value="arrangements" className="mt-4">
          <WorkArrangements />
        </TabsContent>
        
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="email" className="mt-4">
          <EmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
