
import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GoogleAuthRedirect from '@/pages/GoogleAuthRedirect';

// Simple ProtectedRoute component to handle authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate, isLoading]);
  
  // Show loading state or authenticated content
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  // If authenticated, render children
  return isAuthenticated ? <>{children}</> : null;
};

const AppRoutes = () => {
  return (
    <TooltipProvider delayDuration={0}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/gmail-auth-redirect" element={<GoogleAuthRedirect />} />
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
};

export default AppRoutes;
