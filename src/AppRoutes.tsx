import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Shows from '@/pages/Shows';
import ShowDetails from '@/pages/ShowDetails';
import Admin from '@/pages/Admin';
import ProtectedRoute from '@/components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import Database from '@/pages/Database';
import GoogleAuthRedirect from '@/pages/GoogleAuthRedirect';

const queryClient = new QueryClient();

const AppRoutes = () => {
  const authCheck = () => {
    const authData = localStorage.getItem('sb-rfwqowktjisgnucdolwm-auth-token');
    return !!authData;
  };

  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={0}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/shows" element={<ProtectedRoute><Shows /></ProtectedRoute>} />
              <Route path="/shows/:id" element={<ProtectedRoute><ShowDetails /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/database" element={<ProtectedRoute><Database /></ProtectedRoute>} />
              <Route path="/gmail-auth-redirect" element={<GoogleAuthRedirect />} />
            </Routes>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default AppRoutes;
