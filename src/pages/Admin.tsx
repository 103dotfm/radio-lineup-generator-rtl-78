
import React, { useState, useEffect } from 'react';
import UserManagement from '@/components/admin/UserManagement';
import MasterSchedule from '@/components/schedule/MasterSchedule';
import WorkArrangements from '@/components/admin/WorkArrangements';
import EmailSettings from '@/components/admin/EmailSettings';
import DataManagement from '@/components/admin/DataManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Clock, Database, Users, Briefcase, Mail, Calendar } from "lucide-react";
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

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !redirectProcessed) {
      console.log("Found OAuth code in URL, setting default tab to email");
      setDefaultTab("email");
      setRedirectProcessed(true);
      
      // Don't modify the URL here, let EmailSettings handle it
    }
  }, [searchParams, redirectProcessed]);

  useEffect(() => {
    const fetchServerSettings = async () => {
      try {
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

        const now = new Date();
        setServerTime(now);
      } catch (error) {
        console.error('Error fetching system settings:', error);
      }
    };
    fetchServerSettings();

    const interval = setInterval(() => {
      setServerTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const saveTimezoneOffset = async () => {
    try {
      setSavingOffset(true);

      const { data: existingData, error: checkError } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'timezone_offset')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let saveError;

      if (existingData) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: timezoneOffset.toString() })
          .eq('key', 'timezone_offset');
        
        saveError = error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'timezone_offset', value: timezoneOffset.toString() });
        
        saveError = error;
      }

      if (saveError) throw saveError;

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

    const offsetDate = new Date(date.getTime());
    offsetDate.setHours(offsetDate.getHours() + timezoneOffset);
    return offsetDate.toLocaleTimeString('he-IL');
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">ניהול מערכת</h1>
        <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          חזרה ללוח הבקרה
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-2 text-right">
          <CardTitle className="text-xl flex items-center gap-2 justify-end">
            <Clock className="h-5 w-5" />
            הגדרות זמן מערכת
          </CardTitle>
          <CardDescription className="text-right">
            כוונון אזור זמן לשליחת הודעות דואר אלקטרוני
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-6">
            <div className="space-y-2 flex-1 text-right">
              <Label htmlFor="server-time" className="block text-right">זמן שרת נוכחי:</Label>
              <div className="text-lg font-medium text-right" id="server-time">
                {serverTime ? serverTime.toLocaleTimeString('he-IL') : 'טוען...'}
              </div>
            </div>
            
            <div className="space-y-2 flex-1 text-right">
              <Label htmlFor="server-time-offset" className="block text-right">זמן שרת עם היסט:</Label>
              <div className="text-lg font-medium text-green-600 text-right" id="server-time-offset">
                {serverTime ? formatLocalTime(serverTime) : 'טוען...'}
              </div>
            </div>
            
            <div className="space-y-2 flex-1 text-right">
              <Label htmlFor="timezone-offset" className="block text-right">היסט שעות (מספר שלם):</Label>
              <div className="flex gap-2 justify-end">
                <Button onClick={saveTimezoneOffset} disabled={savingOffset}>
                  {savingOffset ? "שומר..." : "שמור היסט"}
                </Button>
                <Input id="timezone-offset" type="number" value={timezoneOffset} onChange={e => setTimezoneOffset(parseInt(e.target.value) || 0)} className="w-24 text-right" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="schedule" className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">לוח שידורים</span>
          </TabsTrigger>
          
          <TabsTrigger value="arrangements" className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Briefcase className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">סידורי עבודה</span>
          </TabsTrigger>
          
          <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">ניהול משתמשים</span>
          </TabsTrigger>
          
          <TabsTrigger value="email" className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Mail className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">דואר אלקטרוני</span>
          </TabsTrigger>
          
          <TabsTrigger value="data" className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Database className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">ניהול נתונים</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="mt-4">
          <div className="border-r-4 border-emerald-500 pr-6 py-3">
            <MasterSchedule />
          </div>
        </TabsContent>
        
        <TabsContent value="arrangements" className="mt-4">
          <div className="border-r-4 border-emerald-500 pr-6 py-3">
            <WorkArrangements />
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="mt-4">
          <div className="border-r-4 border-emerald-500 pr-6 py-3">
            <UserManagement />
          </div>
        </TabsContent>
        
        <TabsContent value="email" className="mt-4">
          <div className="border-r-4 border-emerald-500 pr-6 py-3">
            <EmailSettings />
          </div>
        </TabsContent>
        
        <TabsContent value="data" className="mt-4">
          <div className="border-r-4 border-emerald-500 pr-6 py-3">
            <DataManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
