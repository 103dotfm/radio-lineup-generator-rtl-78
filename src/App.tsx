import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ScrollProvider } from "./contexts/ScrollContext";
import AppRoutes from "./AppRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Configure future flags for React Router
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ScrollProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={routerOptions.future}>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ScrollProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
