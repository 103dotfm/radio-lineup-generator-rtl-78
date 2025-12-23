import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { format, startOfWeek } from 'date-fns';
import { lazy, Suspense } from 'react';

// Eagerly loaded components (core functionality)
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SchedulePage from "./pages/SchedulePage";
import GoogleAuthRedirect from "./pages/GoogleAuthRedirect";
import ScheduleXML from "./pages/ScheduleXML";
import Print from "./pages/Print";
import MainLayout from "./components/layout/MainLayout";

// Lazy loaded components (admin and heavy features)
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const BackupShowPage = lazy(() => import("./pages/BackupShowPage"));
const StudioSchedule = lazy(() => import("./pages/StudioSchedule"));
const PrizesManagement = lazy(() => import("./pages/PrizesManagement"));

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  </div>
);

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log("User not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route path="/print/:id" element={<Print />} />
      <Route path="/schedule.xml" element={<ScheduleXML />} />

      {/* Main App Layout for Protected Routes */}
      <Route element={<MainLayout />}>
        <Route path="/schedule/:weekDate" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
        <Route path="/schedule" element={<Navigate to={`/schedule/${format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')}`} replace />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<LoadingSpinner />}>
                <Admin />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/database"
          element={
            <ProtectedRoute adminOnly>
              <Navigate to="/admin?tab=database" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Index />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/show/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Index />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/backup-show/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <BackupShowPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <Profile />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio-schedule"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <StudioSchedule />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/prizes"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <PrizesManagement />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/google-auth-redirect" element={<GoogleAuthRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
