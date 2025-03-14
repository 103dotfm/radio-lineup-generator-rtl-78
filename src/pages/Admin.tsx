
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import TimezoneSettings from '@/components/admin/TimezoneSettings';
import AdminTabs from '@/components/admin/AdminTabs';

const Admin = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);
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

    // Check if we're being directed to the database tab
    const tab = searchParams.get('tab');
    if (tab === 'database') {
      setDefaultTab("database");
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <AdminHeader />
      
      <TimezoneSettings 
        timezoneOffset={timezoneOffset}
        setTimezoneOffset={setTimezoneOffset}
        serverTime={serverTime}
      />
      
      <AdminTabs defaultTab={defaultTab} />
    </div>
  );
};

export default Admin;
