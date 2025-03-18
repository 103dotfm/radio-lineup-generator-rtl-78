
import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Lazy load components to improve initial load time
const Index = lazy(() => import('./pages/Index'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Print = lazy(() => import('./pages/Print'));
const GoogleAuthRedirect = lazy(() => import('./pages/GoogleAuthRedirect'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));

// Loading component to display while lazy-loaded components are loading
const Loading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

// Protected Route component that redirects to login if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Route configuration
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        
        {/* Gmail Auth Redirect - this route should be public */}
        <Route path="/gmail-auth-redirect" element={<GoogleAuthRedirect />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute>
            <SchedulePage />
          </ProtectedRoute>
        } />
        <Route path="/print/:id" element={
          <ProtectedRoute>
            <Print />
          </ProtectedRoute>
        } />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
