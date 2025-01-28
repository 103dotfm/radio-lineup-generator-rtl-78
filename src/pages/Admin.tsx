import React from 'react';
import UserManagement from '@/components/admin/UserManagement';

const Admin = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-right">ניהול מערכת</h1>
      <UserManagement />
    </div>
  );
};

export default Admin;