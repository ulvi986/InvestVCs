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
import Assessment from "./pages/Assessment";
import AssessmentResults from "./pages/AssessmentResults";
import AnalysisReport from "./pages/AnalysisReport";
import ProfilePage from "./pages/ProfilePage";
import ReadinessLevel from "./pages/ReadinessLevel";
import OverallSummary from "./pages/OverallSummary";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import InvestorSignUp from "./pages/InvestorSignUp";
import UserSignUp from "./pages/UserSignUp";
import JobMatch from "./pages/JobMatch";
import AdminPanel from "./pages/AdminPanel";
import InvestorDashboard from "./pages/InvestorDashboard";
import StartupVacancies from "./pages/StartupVacancies";
import VentureAnalysis from "./pages/VentureAnalysis";
import Workflow from "./pages/Workflow";
import Financials from "./pages/Financials";
import ContactPage from "./pages/ContactPage";
import GrowthHub from "./pages/GrowthHub";
import Community from "./pages/Community";
import Investors from "./pages/Investors";
import PublicProfile from "./pages/PublicProfile";
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
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Loading...</div>;
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
                <Route path="/user-signup" element={<AuthRoute><UserSignUp /></AuthRoute>} />
                <Route path="/" element={<Index />} />
                <Route path="/growth-hub" element={<GrowthHub />} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                <Route path="/investors" element={<ProtectedRoute><Investors /></ProtectedRoute>} />
                <Route path="/job-match" element={<ProtectedRoute><JobMatch /></ProtectedRoute>} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/u/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
                <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
                <Route path="/assessment/results" element={<ProtectedRoute><AssessmentResults /></ProtectedRoute>} />
                <Route path="/evaluation" element={<ProtectedRoute><StartupEvaluation /></ProtectedRoute>} />
                <Route path="/financials" element={<ProtectedRoute><Financials /></ProtectedRoute>} />
                <Route path="/preparation" element={<Navigate to="/financials" replace />} />
                <Route path="/readiness" element={<ProtectedRoute><ReadinessLevel /></ProtectedRoute>} />
                <Route path="/summary" element={<ProtectedRoute><OverallSummary /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><OverallSummary /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/investor" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><InvestorDashboard /></ProtectedRoute>} />
                <Route path="/vacancies" element={<ProtectedRoute><StartupVacancies /></ProtectedRoute>} />
                <Route path="/funding-view" element={<ProtectedRoute><FundingViewPage /></ProtectedRoute>} />
                <Route path="/venture-analysis" element={<ProtectedRoute><VentureAnalysis /></ProtectedRoute>} />
                <Route path="/research" element={<ProtectedRoute><VentureAnalysis /></ProtectedRoute>} />
                <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
                <Route path="/report" element={<ProtectedRoute><AnalysisReport /></ProtectedRoute>} />
                <Route path="/report/:sessionId" element={<ProtectedRoute><AnalysisReport /></ProtectedRoute>} />
                <Route path="/workspace" element={<Navigate to="/workflow" replace />} />
                <Route path="/workflows" element={<Navigate to="/workflow" replace />} />
                <Route path="/agents" element={<Navigate to="/workflow" replace />} />
                <Route path="/analyst" element={<Navigate to="/workflow" replace />} />
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
