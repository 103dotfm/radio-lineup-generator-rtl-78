import React from 'react';
import './App.css';
import AdminPanel from './pages/AdminPanel';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import ForgotPassword from './pages/ForgotPassword';
import UpdateProfile from './pages/UpdateProfile';
import LovableList from './pages/LovableList';
import LovableDetail from './pages/LovableDetail';
import PublicProfile from './pages/PublicProfile';
import Schedule from './pages/Schedule';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotFound from './pages/NotFound';
import Contact from './pages/Contact';
import About from './pages/About';
import Signup from './pages/Signup';
import ScheduleXML from './pages/ScheduleXML';

function App() {
  return (
    <div className="App">
      {/* Add the ScheduleXML component that will trigger XML refresh when the app loads */}
      <ScheduleXML />
      
      <Router>
        <AuthProvider>
          <Navbar />
          <Toaster richColors position="bottom-center" />
          <Routes>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/update-profile"
              element={
                <PrivateRoute>
                  <UpdateProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <AdminPanel />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<LovableList />} />
            <Route path="/lovables/:id" element={<LovableDetail />} />
            <Route path="/profile/:id" element={<PublicProfile />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
