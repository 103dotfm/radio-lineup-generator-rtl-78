import { Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Print from './pages/Print';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import ShowForm from './pages/ShowForm';
import SchedulePage from './pages/SchedulePage';
import GoogleAuthRedirect from './pages/GoogleAuthRedirect';
import DailyScheduleText from './pages/DailyScheduleText';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/print" element={<Print />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/new" element={<ShowForm />} />
      <Route path="/show/:id" element={<ShowForm />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/schedule/:weekDate" element={<SchedulePage />} />
      <Route path="/auth/google/callback" element={<GoogleAuthRedirect />} />
      <Route path="/daily-schedule" element={<DailyScheduleText />} />
      <Route path="/daily-schedule/:date" element={<DailyScheduleText />} />
    </Routes>
  );
}

export default AppRoutes;
