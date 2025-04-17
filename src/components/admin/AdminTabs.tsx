
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useNavigate } from 'react-router-dom';
import UserManagement from '@/components/admin/user-management/UserManagement';
import WorkArrangements from '@/components/admin/WorkArrangements';
import DataManagement from '@/components/admin/data-management/DataManagement';
import DatabaseSettings from '@/components/admin/database-settings/DatabaseSettings';
import EmailSettings from '@/components/admin/EmailSettings';
import WorkersManagement from '@/components/admin/WorkersManagement';
import DigitalWorkArrangement from '@/components/admin/DigitalWorkArrangement';
import ScheduleXMLSettings from '@/components/admin/ScheduleXMLSettings';

type TabType = 'schedule' | 'users' | 'database' | 'data' | 'email' | 'workers' | 'digital' | 'xml';

interface AdminTabsProps {
  defaultTab?: string;
}

const AdminTabs = ({ defaultTab = 'schedule' }: AdminTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((defaultTab as TabType) || 'schedule');
  const navigate = useNavigate();

  useEffect(() => {
    const tabFromParams = searchParams.get('tab');
    if (tabFromParams && isValidTab(tabFromParams)) {
      setActiveTab(tabFromParams as TabType);
    } else if (defaultTab && isValidTab(defaultTab)) {
      setActiveTab(defaultTab as TabType);
    }
  }, [searchParams, defaultTab]);

  const isValidTab = (tab: string): tab is TabType => {
    return ['schedule', 'users', 'database', 'data', 'email', 'workers', 'digital', 'xml'].includes(tab);
  };

  const handleTabChange = (value: string) => {
    if (isValidTab(value)) {
      setActiveTab(value);
      setSearchParams({ tab: value });
    }
  };

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={handleTabChange}
      className="mt-6"
      dir="rtl"
    >
      <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 w-full">
        <TabsTrigger value="schedule">לוח שידורים</TabsTrigger>
        <TabsTrigger value="users">משתמשים</TabsTrigger>
        <TabsTrigger value="data">ניהול נתונים</TabsTrigger>
        <TabsTrigger value="database">מסד נתונים</TabsTrigger>
        <TabsTrigger value="email">אימייל</TabsTrigger>
        <TabsTrigger value="workers">עובדים</TabsTrigger>
        <TabsTrigger value="digital">שיבוץ דיגיטל</TabsTrigger>
        <TabsTrigger value="xml">Schedule XML</TabsTrigger>
      </TabsList>
      
      <TabsContent value="schedule" className="pt-6">
        <WorkArrangements />
      </TabsContent>
      
      <TabsContent value="users" className="pt-6">
        <UserManagement />
      </TabsContent>
      
      <TabsContent value="data" className="pt-6">
        <DataManagement />
      </TabsContent>
      
      <TabsContent value="database" className="pt-6">
        <DatabaseSettings />
      </TabsContent>
      
      <TabsContent value="email" className="pt-6">
        <EmailSettings />
      </TabsContent>
      
      <TabsContent value="workers" className="pt-6">
        <WorkersManagement />
      </TabsContent>
      
      <TabsContent value="digital" className="pt-6">
        <DigitalWorkArrangement />
      </TabsContent>
      
      <TabsContent value="xml" className="pt-6">
        <ScheduleXMLSettings />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
