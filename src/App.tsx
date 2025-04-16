
import React from 'react';
import './App.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import AppRoutes from './AppRoutes';
import ScheduleXML from './pages/ScheduleXML';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client
const queryClient = new QueryClient();

function App() {
  return (
    <div className="App">
      {/* Add the ScheduleXML component that will trigger XML refresh when the app loads */}
      <ScheduleXML />
      
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <Toaster richColors position="bottom-center" />
            <AppRoutes />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </div>
  );
}

export default App;
