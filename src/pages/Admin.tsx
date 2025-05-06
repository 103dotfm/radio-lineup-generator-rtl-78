
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import TimezoneSettings from '@/components/admin/TimezoneSettings';
import AdminTabs from '@/components/admin/AdminTabs';
import DomainSettings from '@/components/admin/DomainSettings';
import StaffManagement from '@/components/admin/StaffManagement';

const Admin = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [redirectProcessed, setRedirectProcessed] = useState(false);
  const [defaultTab, setDefaultTab] = useState("schedule");
  const [showStaffManagement, setShowStaffManagement] = useState(false);
  // Add appDomain state to fix the missing setAppDomain error
  const [appDomain, setAppDomain] = useState("");

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !redirectProcessed) {
      console.log("Found OAuth code in URL, setting default tab to email");
      setDefaultTab("email");
      setRedirectProcessed(true);
    }

    // Check if we're being directed to specific tabs
    const tab = searchParams.get('tab');
    if (tab === 'database') {
      setDefaultTab("database");
    } else if (tab === 'exports') {
      setDefaultTab("exports");
      console.log("Setting default tab to exports based on URL parameter");
    } else if (tab === 'staff') {
      setShowStaffManagement(true);
    }
  }, [searchParams, redirectProcessed]);

  useEffect(() => {
    const fetchServerSettings = async () => {
      try {
        // Fetch timezone offset
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

        // Fetch app domain
        const { data: domainData, error: domainError } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', 'app_domain')
          .single();
          
        if (!domainError && domainData) {
          setAppDomain(domainData.value);
        } else {
          console.warn("Could not fetch app domain, none set:", domainError);
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

  if (showStaffManagement) {
    return (
      <div className="container mx-auto py-8" dir="rtl">
        <AdminHeader />
        <div className="mt-6">
          <StaffManagement />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <AdminHeader />
      
      <div className="mt-6 grid grid-cols-1 gap-6">
        <TimezoneSettings 
          timezoneOffset={timezoneOffset}
          setTimezoneOffset={setTimezoneOffset}
          serverTime={serverTime}
        />
        
        <DomainSettings />
      </div>
      
      <AdminTabs defaultTab={defaultTab} />
    </div>
  );
};

export default Admin;
