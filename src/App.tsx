import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StartupProvider } from "@/context/StartupContext";
import Index from "./pages/Index";
import StartupEvaluation from "./pages/StartupEvaluation";
import PreparationPhase from "./pages/PreparationPhase";
import ReadinessLevel from "./pages/ReadinessLevel";
import OverallSummary from "./pages/OverallSummary";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <StartupProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/evaluation" element={<StartupEvaluation />} />
            <Route path="/preparation" element={<PreparationPhase />} />
            <Route path="/readiness" element={<ReadinessLevel />} />
            <Route path="/summary" element={<OverallSummary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StartupProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
