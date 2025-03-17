
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GoogleAuthRedirect from '@/pages/GoogleAuthRedirect';

// Create a new QueryClient instance
const queryClient = new QueryClient();

const AppRoutes = () => {
  const authCheck = () => {
    const authData = localStorage.getItem('sb-rfwqowktjisgnucdolwm-auth-token');
    return !!authData;
  };

  // Simple ProtectedRoute component to handle authentication
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = authCheck();
    return isAuthenticated ? <>{children}</> : <Login />;
  };

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/gmail-auth-redirect" element={<GoogleAuthRedirect />} />
          </Routes>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default AppRoutes;
