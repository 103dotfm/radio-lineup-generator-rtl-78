import React from 'react';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Admin = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">ניהול מערכת</h1>
      <UserManagement />
    </div>
  );
};

export default Admin;