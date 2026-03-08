import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
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
  loading: boolean;
}

const StartupContext = createContext<StartupContextType | null>(null);

export const useStartupContext = () => {
  const ctx = useContext(StartupContext);
  if (!ctx) throw new Error("useStartupContext must be used within StartupProvider");
  return ctx;
};

export const StartupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Evaluation
  const [berkus, setBerkusState] = useState(0);
  const [scorecard, setScorecardState] = useState(0);
  const [riskFactor, setRiskFactorState] = useState(0);

  // Financial
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);

  // Readiness
  const [trlAnswers, setTrlAnswers] = useState<Answers>({});
  const [crlAnswers, setCrlAnswers] = useState<Answers>({});
  const [frlAnswers, setFrlAnswers] = useState<Answers>({});

  // Debounce timer refs
  const evalTimer = useRef<ReturnType<typeof setTimeout>>();
  const readinessTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load all data on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      const [evalRes, snapRes, readRes] = await Promise.all([
        supabase.from("evaluations").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("financial_snapshots").select("*").eq("user_id", user.id).order("date", { ascending: true }),
        supabase.from("readiness_answers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (evalRes.data) {
        setBerkusState(Number(evalRes.data.berkus));
        setScorecardState(Number(evalRes.data.scorecard));
        setRiskFactorState(Number(evalRes.data.risk_factor));
      }

      if (snapRes.data) {
        setSnapshots(
          snapRes.data.map((row: any) => ({
            ...row.data,
            id: row.id,
            date: new Date(row.date),
          }))
        );
      }

      if (readRes.data) {
        setTrlAnswers(readRes.data.trl_answers as Answers);
        setCrlAnswers(readRes.data.crl_answers as Answers);
        setFrlAnswers(readRes.data.frl_answers as Answers);
      }

      setLoading(false);
    };

    loadAll();
  }, [user]);

  // Save evaluation (debounced upsert)
  const saveEvaluation = useCallback(
    (b: number, s: number, r: number) => {
      if (!user) return;
      clearTimeout(evalTimer.current);
      evalTimer.current = setTimeout(async () => {
        await supabase.from("evaluations").upsert(
          { user_id: user.id, berkus: b, scorecard: s, risk_factor: r, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      }, 500);
    },
    [user]
  );

  const setBerkus = useCallback(
    (v: number) => {
      setBerkusState(v);
      saveEvaluation(v, scorecard, riskFactor);
    },
    [scorecard, riskFactor, saveEvaluation]
  );

  const setScorecard = useCallback(
    (v: number) => {
      setScorecardState(v);
      saveEvaluation(berkus, v, riskFactor);
    },
    [berkus, riskFactor, saveEvaluation]
  );

  const setRiskFactor = useCallback(
    (v: number) => {
      setRiskFactorState(v);
      saveEvaluation(berkus, scorecard, v);
    },
    [berkus, scorecard, saveEvaluation]
  );

  // Save financial snapshot
  const addSnapshot = useCallback(
    async (s: FinancialSnapshot) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("financial_snapshots")
        .insert({ user_id: user.id, date: new Date(s.date).toISOString(), data: s as any })
        .select()
        .single();

      if (!error && data) {
        const newSnap = { ...s, id: data.id, date: new Date(data.date) };
        setSnapshots((prev) =>
          [...prev, newSnap].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        );
      }
    },
    [user]
  );

  const removeSnapshot = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("financial_snapshots").delete().eq("id", id).eq("user_id", user.id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    },
    [user]
  );

  // Save readiness (debounced upsert)
  const saveReadiness = useCallback(
    (trl: Answers, crl: Answers, frl: Answers) => {
      if (!user) return;
      clearTimeout(readinessTimer.current);
      readinessTimer.current = setTimeout(async () => {
        await supabase.from("readiness_answers").upsert(
          {
            user_id: user.id,
            trl_answers: trl,
            crl_answers: crl,
            frl_answers: frl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }, 500);
    },
    [user]
  );

  // Wrap readiness setters to auto-save
  const setTrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback(
    (val) => {
      setTrlAnswers((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        saveReadiness(next, crlAnswers, frlAnswers);
        return next;
      });
    },
    [crlAnswers, frlAnswers, saveReadiness]
  );

  const setCrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback(
    (val) => {
      setCrlAnswers((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        saveReadiness(trlAnswers, next, frlAnswers);
        return next;
      });
    },
    [trlAnswers, frlAnswers, saveReadiness]
  );

  const setFrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback(
    (val) => {
      setFrlAnswers((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        saveReadiness(trlAnswers, crlAnswers, next);
        return next;
      });
    },
    [trlAnswers, crlAnswers, saveReadiness]
  );

  return (
    <StartupContext.Provider
      value={{
        evaluation: { berkus, scorecard, riskFactor, setBerkus, setScorecard, setRiskFactor },
        financial: { snapshots, addSnapshot, removeSnapshot },
        readiness: {
          trlAnswers,
          crlAnswers,
          frlAnswers,
          setTrlAnswers: setTrlAnswersWrapped,
          setCrlAnswers: setCrlAnswersWrapped,
          setFrlAnswers: setFrlAnswersWrapped,
        },
        loading,
      }}
    >
      {children}
    </StartupContext.Provider>
  );
};
