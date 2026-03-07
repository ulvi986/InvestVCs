import { createContext, useContext, useState, ReactNode } from "react";
import type { FinancialSnapshot } from "@/pages/PreparationPhase";

type Answers = Record<string, boolean>;

interface ReadinessData {
  trlAnswers: Answers;
  crlAnswers: Answers;
  frlAnswers: Answers;
  setTrlAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  setCrlAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  setFrlAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}

interface EvaluationData {
  berkus: number;
  scorecard: number;
  riskFactor: number;
  setBerkus: (v: number) => void;
  setScorecard: (v: number) => void;
  setRiskFactor: (v: number) => void;
}

interface FinancialData {
  snapshots: FinancialSnapshot[];
  addSnapshot: (s: FinancialSnapshot) => void;
  removeSnapshot: (id: string) => void;
}

interface StartupContextType {
  evaluation: EvaluationData;
  financial: FinancialData;
  readiness: ReadinessData;
}

const StartupContext = createContext<StartupContextType | null>(null);

export const useStartupContext = () => {
  const ctx = useContext(StartupContext);
  if (!ctx) throw new Error("useStartupContext must be used within StartupProvider");
  return ctx;
};

export const StartupProvider = ({ children }: { children: ReactNode }) => {
  // Evaluation
  const [berkus, setBerkus] = useState(0);
  const [scorecard, setScorecard] = useState(0);
  const [riskFactor, setRiskFactor] = useState(0);

  // Financial
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const addSnapshot = (s: FinancialSnapshot) => {
    setSnapshots(prev => [...prev, s].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };
  const removeSnapshot = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  // Readiness
  const [trlAnswers, setTrlAnswers] = useState<Answers>({});
  const [crlAnswers, setCrlAnswers] = useState<Answers>({});
  const [frlAnswers, setFrlAnswers] = useState<Answers>({});

  return (
    <StartupContext.Provider value={{
      evaluation: { berkus, scorecard, riskFactor, setBerkus, setScorecard, setRiskFactor },
      financial: { snapshots, addSnapshot, removeSnapshot },
      readiness: { trlAnswers, crlAnswers, frlAnswers, setTrlAnswers, setCrlAnswers, setFrlAnswers },
    }}>
      {children}
    </StartupContext.Provider>
  );
};
