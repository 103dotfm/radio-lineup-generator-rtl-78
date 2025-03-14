
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const AdminHeader = () => {
  const navigate = useNavigate();
  
  return (
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
  );
};

export default AdminHeader;
