import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StartupProvider } from "@/context/StartupContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Index from "./pages/Index";
import StartupEvaluation from "./pages/StartupEvaluation";
import ProfilePage from "./pages/ProfilePage";
import PreparationPhase from "./pages/PreparationPhase";
import ReadinessLevel from "./pages/ReadinessLevel";
import OverallSummary from "./pages/OverallSummary";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import InvestorSignUp from "./pages/InvestorSignUp";
import AdminPanel from "./pages/AdminPanel";
import InvestorDashboard from "./pages/InvestorDashboard";
import StartupVacancies from "./pages/StartupVacancies";
import VentureAnalysis from "./pages/VentureAnalysis";
import ContactPage from "./pages/ContactPage";
import GrowthHub from "./pages/GrowthHub";
import FundingViewPage from "./pages/FundingViewPage";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
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
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
        <LanguageProvider>
          <StartupProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />
                <Route path="/signin" element={<AuthRoute><SignIn /></AuthRoute>} />
                <Route path="/investor-signup" element={<AuthRoute><InvestorSignUp /></AuthRoute>} />
                <Route path="/" element={<Index />} />
                <Route path="/growth-hub" element={<GrowthHub />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/evaluation" element={<ProtectedRoute><StartupEvaluation /></ProtectedRoute>} />
                <Route path="/preparation" element={<ProtectedRoute><PreparationPhase /></ProtectedRoute>} />
                <Route path="/readiness" element={<ProtectedRoute><ReadinessLevel /></ProtectedRoute>} />
                <Route path="/summary" element={<ProtectedRoute><OverallSummary /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/investor" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
                <Route path="/vacancies" element={<ProtectedRoute><StartupVacancies /></ProtectedRoute>} />
                <Route path="/funding-view" element={<ProtectedRoute><FundingViewPage /></ProtectedRoute>} />
                <Route path="/venture-analysis" element={<ProtectedRoute><VentureAnalysis /></ProtectedRoute>} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/success" element={<Success />} />
                <Route path="/cancel" element={<Cancel />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </StartupProvider>
        </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
