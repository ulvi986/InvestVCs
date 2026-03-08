import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StartupProvider } from "@/context/StartupContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Index from "./pages/Index";
import StartupEvaluation from "./pages/StartupEvaluation";
import ProfilePage from "./pages/ProfilePage";
import PreparationPhase from "./pages/PreparationPhase";
import ReadinessLevel from "./pages/ReadinessLevel";
import OverallSummary from "./pages/OverallSummary";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Yüklənir...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <StartupProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />
              <Route path="/signin" element={<AuthRoute><SignIn /></AuthRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/evaluation" element={<ProtectedRoute><StartupEvaluation /></ProtectedRoute>} />
              <Route path="/preparation" element={<ProtectedRoute><PreparationPhase /></ProtectedRoute>} />
              <Route path="/readiness" element={<ProtectedRoute><ReadinessLevel /></ProtectedRoute>} />
              <Route path="/summary" element={<ProtectedRoute><OverallSummary /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </StartupProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
