import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MasterSchedule from '@/components/schedule/MasterSchedule';
import UserManagement from '@/components/admin/user-management/UserManagement';
import WorkArrangements from '@/components/admin/WorkArrangements';
import EmailSettings from '@/components/admin/EmailSettings';
import DataManagement from '@/components/admin/data-management/DataManagement';
import DatabaseSettings from '@/components/admin/database-settings/DatabaseSettings';
import ScheduleExportSettings from '@/components/admin/ScheduleExportSettings';
import { Calendar, Briefcase, Users, Mail, Database, HardDrive, FileCode } from "lucide-react";
interface AdminTabsProps {
  defaultTab: string;
}
const AdminTabs = ({
  defaultTab
}: AdminTabsProps) => {
  return <Tabs defaultValue={defaultTab} className="w-full admin-tabs">
      <TabsList className="grid w-full grid-cols-7 md:grid-cols-4 lg:grid-cols-7 mb-4 md:mb-8 overflow-x-auto mx-px">
        <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">לוח שידורים</span>
        </TabsTrigger>
        
        <TabsTrigger value="arrangements" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">סידורי עבודה</span>
        </TabsTrigger>
        
        <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">ניהול משתמשים</span>
        </TabsTrigger>
        
        <TabsTrigger value="email" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">דואר אלקטרוני</span>
        </TabsTrigger>
        
        <TabsTrigger value="data" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <Database className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">ניהול נתונים</span>
        </TabsTrigger>
        
        <TabsTrigger value="database" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">הגדרות בסיס נתונים</span>
        </TabsTrigger>
        
        <TabsTrigger value="exports" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl mx-0.5 sm:mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs sm:text-sm">
          <FileCode className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="font-medium truncate">ייצוא לוח שידורים</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="schedule" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <MasterSchedule />
        </div>
      </TabsContent>
      
      <TabsContent value="arrangements" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <WorkArrangements />
        </div>
      </TabsContent>
      
      <TabsContent value="users" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <UserManagement />
        </div>
      </TabsContent>
      
      <TabsContent value="email" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <EmailSettings />
        </div>
      </TabsContent>
      
      <TabsContent value="data" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <DataManagement />
        </div>
      </TabsContent>
      
      <TabsContent value="database" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <DatabaseSettings />
        </div>
      </TabsContent>
      
      <TabsContent value="exports" className="mt-2 md:mt-4">
        <div className="border-r-2 md:border-r-4 border-emerald-500 pr-2 md:pr-6 py-2 md:py-3">
          <ScheduleExportSettings />
        </div>
      </TabsContent>
    </Tabs>;
};
export default AdminTabs;