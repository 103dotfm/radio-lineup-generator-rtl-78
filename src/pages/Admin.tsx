import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import TimezoneSettings from '@/components/admin/TimezoneSettings';
import DomainSettings from '@/components/admin/DomainSettings';
import WorkerManagement from '@/components/admin/workers/WorkerManagement';
import MasterSchedule from '@/components/schedule/MasterSchedule';
import WorkArrangements from '@/components/admin/WorkArrangements';
import EmailSettings from '@/components/admin/EmailSettings';
import DataManagement from '@/components/admin/data-management/DataManagement';
import DatabaseSettings from '@/components/admin/database-settings/DatabaseSettings';
import ScheduleExportSettings from '@/components/admin/ScheduleExportSettings';
import UserManagement from '@/components/admin/user-management/UserManagement';
import AdminLayout from '@/components/admin/layout/AdminLayout';
import RDSSettings from '@/components/admin/RDSSettings';
import TranslationMappings from '@/components/admin/TranslationMappings';
import StudioScheduleAdmin from '@/components/admin/StudioScheduleAdmin';
import { StorageManagement } from '@/components/admin/storage-management/StorageManagement';
import LineupImport from '@/components/admin/lineup-import/LineupImport';
import { useNavigate } from 'react-router-dom';
import type { AdminSectionKey, AdminSubKey } from '@/components/admin/layout/AdminSidebar';

const Admin = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [redirectProcessed, setRedirectProcessed] = useState(false);
  const [defaultTab, setDefaultTab] = useState("schedule");
  const [showStaffManagement, setShowStaffManagement] = useState(false);
  const [appDomain, setAppDomain] = useState("");
  const navigate = useNavigate();

  // New: sidebar routing state derived from query params
  const section = (searchParams.get('section') as AdminSectionKey) || 'general';
  const sub = (searchParams.get('sub') as AdminSubKey) || (section === 'arrangements' ? 'producers' : section === 'workers' ? 'management' : undefined);

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
      setDefaultTab("workers");
      setShowStaffManagement(true);
    }
    // Back-compat: map legacy ?tab=staff to the new workers section
    const legacyTab = searchParams.get('tab');
    if (legacyTab === 'staff') {
      const params = new URLSearchParams(searchParams);
      params.set('section', 'workers');
      params.delete('tab');
      navigate({ pathname: '/admin', search: params.toString() }, { replace: true });
    }
  }, [searchParams, redirectProcessed, navigate]);

  useEffect(() => {
    const fetchServerSettings = async () => {
      try {
        // Fetch timezone offset
        const { data: settingsData, error: settingsError } = await supabase
          .from('system-settings')
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
          .from('system-settings')
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

  const handleNavigate = (nextSection: AdminSectionKey, nextSub?: AdminSubKey) => {
    const params = new URLSearchParams(searchParams);
    params.set('section', nextSection);
    if (nextSub) params.set('sub', nextSub); else params.delete('sub');
    navigate({ pathname: '/admin', search: params.toString() }, { replace: false });
  };

  const renderContent = () => {
    switch (section) {
      case 'general':
        return (
          <div className="grid grid-cols-1 gap-6">
            <TimezoneSettings
              timezoneOffset={timezoneOffset}
              setTimezoneOffset={setTimezoneOffset}
              serverTime={serverTime}
            />
            <DomainSettings />
          </div>
        );
      case 'schedule':
        return <MasterSchedule />;
      case 'studio-schedule':
        return <StudioScheduleAdmin />;
      case 'arrangements':
        if (sub === 'engineers') {
          return <WorkArrangements mode="engineers" />;
        }
        if (sub === 'digital') {
          return <WorkArrangements mode="digital" />;
        }
        return <WorkArrangements mode="producers" />;
      case 'workers':
        if (sub === 'users') {
          return <UserManagement />;
        }
        return <WorkerManagement />;
      case 'email': {
        // Delegate to EmailSettings subviews based on sub param
        return <EmailSettings />;
      }
      case 'data':
        // Route submenus: export/import/backup/schedule-export
        if (sub === 'schedule-export') {
          return <ScheduleExportSettings />;
        }
        return <DataManagement />;
      case 'database':
        return <DatabaseSettings />;
      case 'storage':
        return <StorageManagement />;
      case 'rds':
        if (sub === 'translations') {
          return <TranslationMappings />;
        }
        if (sub === 'rds-settings') {
          return <RDSSettings />;
        }
        // Default to RDS settings if no sub is specified
        return <RDSSettings />;
      case 'lineup-import':
        return <LineupImport />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-3xl font-bold tracking-tight mb-8">ניהול מערכת</h1>
      <AdminLayout section={section} sub={sub} onNavigate={handleNavigate}>
        {renderContent()}
      </AdminLayout>
    </div>
  );
};

export default Admin;
