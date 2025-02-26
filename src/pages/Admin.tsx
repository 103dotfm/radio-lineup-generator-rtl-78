
import React from 'react';
import UserManagement from '@/components/admin/UserManagement';
import MasterSchedule from '@/components/schedule/MasterSchedule';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

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
      
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="schedule">לוח שידורים ראשי</TabsTrigger>
          <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="mt-4">
          <MasterSchedule />
        </TabsContent>
        
        <TabsContent value="users" className="mt-4">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
