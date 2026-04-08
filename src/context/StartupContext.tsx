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

export interface VCAnswers {
  revenue: number;
  netIncomeMargin: number;
  exitMultiple: number;
  customMultiple: number;
  isOther: boolean;
  exitYears: number;
  requiredIRR: number;
  investmentAmount: number;
}

export interface ChicagoAnswers {
  revenue: number;
  exitMultiple: number;
  customMultiple: number;
  isOther: boolean;
  yearsToExit: number;
  discountRates: { worst: number; base: number; best: number };
  probabilities: { worst: number; base: number; best: number };
}

interface EvaluationData {
  berkus: number;
  scorecard: number;
  riskFactor: number;
  berkusAnswers: (number | null)[];
  scorecardAnswers: (number | null)[];
  scorecardMedian: number;
  riskAnswers: (number | null)[];
  vcAnswers: VCAnswers;
  chicagoAnswers: ChicagoAnswers;
  setBerkus: (v: number) => void;
  setScorecard: (v: number) => void;
  setRiskFactor: (v: number) => void;
  setBerkusAnswers: (v: (number | null)[]) => void;
  setScorecardAnswers: (v: (number | null)[]) => void;
  setScorecardMedian: (v: number) => void;
  setRiskAnswers: (v: (number | null)[]) => void;
  setVcAnswers: (v: VCAnswers) => void;
  setChicagoAnswers: (v: ChicagoAnswers) => void;
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

const defaultVcAnswers: VCAnswers = {
  revenue: 0, netIncomeMargin: 20, exitMultiple: 8, customMultiple: 20,
  isOther: false, exitYears: 5, requiredIRR: 30, investmentAmount: 0,
};

const defaultChicagoAnswers: ChicagoAnswers = {
  revenue: 0, exitMultiple: 8, customMultiple: 20, isOther: false, yearsToExit: 5,
  discountRates: { worst: 50, base: 30, best: 20 },
  probabilities: { worst: 20, base: 70, best: 10 },
};

const StartupContext = createContext<StartupContextType | null>(null);

export const useStartupContext = () => {
  const ctx = useContext(StartupContext);
  if (!ctx) throw new Error("useStartupContext must be used within StartupProvider");
  return ctx;
};

export const StartupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Evaluation final values
  const [berkus, setBerkusState] = useState(0);
  const [scorecard, setScorecardState] = useState(0);
  const [riskFactor, setRiskFactorState] = useState(0);

  // Detailed answers
  const [berkusAnswers, setBerkusAnswersState] = useState<(number | null)[]>([null, null, null, null, null]);
  const [scorecardAnswers, setScorecardAnswersState] = useState<(number | null)[]>(Array(7).fill(null));
  const [scorecardMedian, setScorecardMedianState] = useState(0);
  const [riskAnswers, setRiskAnswersState] = useState<(number | null)[]>(Array(12).fill(null));
  const [vcAnswers, setVcAnswersState] = useState<VCAnswers>(defaultVcAnswers);
  const [chicagoAnswers, setChicagoAnswersState] = useState<ChicagoAnswers>(defaultChicagoAnswers);

  // Financial
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);

  // Readiness
  const [trlAnswers, setTrlAnswers] = useState<Answers>({});
  const [crlAnswers, setCrlAnswers] = useState<Answers>({});
  const [frlAnswers, setFrlAnswers] = useState<Answers>({});

  const evalTimer = useRef<ReturnType<typeof setTimeout>>();
  const readinessTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load all data
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadAll = async () => {
      const [evalRes, snapRes, readRes] = await Promise.all([
        supabase.from("evaluations").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("financial_snapshots").select("*").eq("user_id", user.id).order("date", { ascending: true }),
        supabase.from("readiness_answers").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (evalRes.data) {
        const d = evalRes.data as any;
        setBerkusState(Number(d.berkus));
        setScorecardState(Number(d.scorecard));
        setRiskFactorState(Number(d.risk_factor));
        if (d.berkus_answers && Array.isArray(d.berkus_answers) && d.berkus_answers.length > 0)
          setBerkusAnswersState(d.berkus_answers);
        if (d.scorecard_answers && Array.isArray(d.scorecard_answers) && d.scorecard_answers.length > 0)
          setScorecardAnswersState(d.scorecard_answers);
        if (d.scorecard_median) setScorecardMedianState(Number(d.scorecard_median));
        if (d.risk_answers && Array.isArray(d.risk_answers) && d.risk_answers.length > 0)
          setRiskAnswersState(d.risk_answers);
        if (d.vc_answers && typeof d.vc_answers === 'object' && d.vc_answers.revenue !== undefined)
          setVcAnswersState(d.vc_answers);
        if (d.chicago_answers && typeof d.chicago_answers === 'object' && d.chicago_answers.revenue !== undefined)
          setChicagoAnswersState(d.chicago_answers);
      }

      if (snapRes.data) {
        setSnapshots(snapRes.data.map((row: any) => ({ ...row.data, id: row.id, date: new Date(row.date) })));
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

  // Save evaluation (debounced)
  const saveEvaluation = useCallback(
    (b: number, s: number, r: number, ba: (number|null)[], sa: (number|null)[], sm: number, ra: (number|null)[], va: VCAnswers, ca: ChicagoAnswers) => {
      if (!user) return;
      clearTimeout(evalTimer.current);
      evalTimer.current = setTimeout(async () => {
        await supabase.from("evaluations").upsert(
          {
            user_id: user.id,
            berkus: b, scorecard: s, risk_factor: r,
            berkus_answers: ba as any, scorecard_answers: sa as any, scorecard_median: sm,
            risk_answers: ra as any, vc_answers: va as any, chicago_answers: ca as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }, 500);
    },
    [user]
  );

  // Use refs to always have latest state for save
  const stateRef = useRef({ berkus, scorecard, riskFactor, berkusAnswers, scorecardAnswers, scorecardMedian, riskAnswers, vcAnswers, chicagoAnswers });
  useEffect(() => {
    stateRef.current = { berkus, scorecard, riskFactor, berkusAnswers, scorecardAnswers, scorecardMedian, riskAnswers, vcAnswers, chicagoAnswers };
  });

  const triggerSave = useCallback((overrides: Partial<typeof stateRef.current> = {}) => {
    const s = { ...stateRef.current, ...overrides };
    saveEvaluation(s.berkus, s.scorecard, s.riskFactor, s.berkusAnswers, s.scorecardAnswers, s.scorecardMedian, s.riskAnswers, s.vcAnswers, s.chicagoAnswers);
  }, [saveEvaluation]);

  const setBerkus = useCallback((v: number) => { setBerkusState(v); triggerSave({ berkus: v }); }, [triggerSave]);
  const setScorecard = useCallback((v: number) => { setScorecardState(v); triggerSave({ scorecard: v }); }, [triggerSave]);
  const setRiskFactor = useCallback((v: number) => { setRiskFactorState(v); triggerSave({ riskFactor: v }); }, [triggerSave]);
  const setBerkusAnswers = useCallback((v: (number|null)[]) => { setBerkusAnswersState(v); triggerSave({ berkusAnswers: v }); }, [triggerSave]);
  const setScorecardAnswers = useCallback((v: (number|null)[]) => { setScorecardAnswersState(v); triggerSave({ scorecardAnswers: v }); }, [triggerSave]);
  const setScorecardMedian = useCallback((v: number) => { setScorecardMedianState(v); triggerSave({ scorecardMedian: v }); }, [triggerSave]);
  const setRiskAnswers = useCallback((v: (number|null)[]) => { setRiskAnswersState(v); triggerSave({ riskAnswers: v }); }, [triggerSave]);
  const setVcAnswers = useCallback((v: VCAnswers) => { setVcAnswersState(v); triggerSave({ vcAnswers: v }); }, [triggerSave]);
  const setChicagoAnswers = useCallback((v: ChicagoAnswers) => { setChicagoAnswersState(v); triggerSave({ chicagoAnswers: v }); }, [triggerSave]);

  // Financial
  const addSnapshot = useCallback(async (s: FinancialSnapshot) => {
    if (!user) return;
    const { data, error } = await supabase.from("financial_snapshots")
      .insert({ user_id: user.id, date: new Date(s.date).toISOString(), data: s as any }).select().single();
    if (!error && data) {
      setSnapshots((prev) => [...prev, { ...s, id: data.id, date: new Date(data.date) }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
  }, [user]);

  const removeSnapshot = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("financial_snapshots").delete().eq("id", id).eq("user_id", user.id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  }, [user]);

  // Readiness
  const saveReadiness = useCallback((trl: Answers, crl: Answers, frl: Answers) => {
    if (!user) return;
    clearTimeout(readinessTimer.current);
    readinessTimer.current = setTimeout(async () => {
      await supabase.from("readiness_answers").upsert(
        { user_id: user.id, trl_answers: trl, crl_answers: crl, frl_answers: frl, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }, 500);
  }, [user]);

  const setTrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback((val) => {
    setTrlAnswers((prev) => { const next = typeof val === "function" ? val(prev) : val; saveReadiness(next, crlAnswers, frlAnswers); return next; });
  }, [crlAnswers, frlAnswers, saveReadiness]);

  const setCrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback((val) => {
    setCrlAnswers((prev) => { const next = typeof val === "function" ? val(prev) : val; saveReadiness(trlAnswers, next, frlAnswers); return next; });
  }, [trlAnswers, frlAnswers, saveReadiness]);

  const setFrlAnswersWrapped: React.Dispatch<React.SetStateAction<Answers>> = useCallback((val) => {
    setFrlAnswers((prev) => { const next = typeof val === "function" ? val(prev) : val; saveReadiness(trlAnswers, crlAnswers, next); return next; });
  }, [trlAnswers, crlAnswers, saveReadiness]);

  return (
    <StartupContext.Provider
      value={{
        evaluation: {
          berkus, scorecard, riskFactor,
          berkusAnswers, scorecardAnswers, scorecardMedian, riskAnswers, vcAnswers, chicagoAnswers,
          setBerkus, setScorecard, setRiskFactor,
          setBerkusAnswers, setScorecardAnswers, setScorecardMedian, setRiskAnswers, setVcAnswers, setChicagoAnswers,
        },
        financial: { snapshots, addSnapshot, removeSnapshot },
        readiness: { trlAnswers, crlAnswers, frlAnswers, setTrlAnswers: setTrlAnswersWrapped, setCrlAnswers: setCrlAnswersWrapped, setFrlAnswers: setFrlAnswersWrapped },
        loading,
      }}
    >
      {children}
    </StartupContext.Provider>
  );
};
