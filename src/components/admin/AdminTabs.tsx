
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MasterSchedule from '@/components/schedule/MasterSchedule';
import UserManagement from '@/components/admin/UserManagement';
import WorkArrangements from '@/components/admin/WorkArrangements';
import EmailSettings from '@/components/admin/EmailSettings';
import DataManagement from '@/components/admin/DataManagement';
import { Calendar, Briefcase, Users, Mail, Database } from "lucide-react";

interface AdminTabsProps {
  defaultTab: string;
}

const AdminTabs = ({ defaultTab }: AdminTabsProps) => {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-8">
        <TabsTrigger 
          value="schedule" 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
          <Calendar className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">לוח שידורים</span>
        </TabsTrigger>
        
        <TabsTrigger 
          value="arrangements" 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
          <Briefcase className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">סידורי עבודה</span>
        </TabsTrigger>
        
        <TabsTrigger 
          value="users" 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
          <Users className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">ניהול משתמשים</span>
        </TabsTrigger>
        
        <TabsTrigger 
          value="email" 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
          <Mail className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">דואר אלקטרוני</span>
        </TabsTrigger>
        
        <TabsTrigger 
          value="data" 
          className="flex items-center gap-2 px-4 py-3 rounded-2xl mx-1 bg-opacity-80 bg-emerald-200 hover:bg-emerald-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
        >
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
  );
};

export default AdminTabs;
