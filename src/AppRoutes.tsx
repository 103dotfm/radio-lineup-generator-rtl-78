
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { format, startOfWeek } from 'date-fns';
import Index from "./pages/Index";
import Print from "./pages/Print";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import SchedulePage from "./pages/SchedulePage";
import GoogleAuthRedirect from "./pages/GoogleAuthRedirect";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
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
      <Route path="/schedule/:weekDate" element={<SchedulePage />} />
      <Route path="/schedule" element={<Navigate to={`/schedule/${format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')}`} replace />} />
      <Route path="/google-auth-redirect" element={<GoogleAuthRedirect />} />
      
      {/* XML is now handled by Express server, not React routing */}
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Admin />
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
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/show/:id"
        element={
          <ProtectedRoute>
            <Index />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
