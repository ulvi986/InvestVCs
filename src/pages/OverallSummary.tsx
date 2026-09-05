import DashboardLayout from "@/components/DashboardLayout";
import { useStartupContext } from "@/context/StartupContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { computeVCValuation, computeChicagoValuation } from "@/lib/valuationUtils";
import { READINESS_MAX_LEVEL, computeReadinessLevel } from "@/lib/analyst/methodologies/readiness";
import { computeFinancialHealthScore } from "@/lib/analyst/methodologies/financial";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { renderMarkdown } from "@/lib/markdown";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle,
  DollarSign, Users, Wallet, Target, Sparkles, Loader2, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

// Readiness levels and the financial health score are computed by the shared
// methodology modules, so this page and the autonomous analyst always agree.
const TRL_COUNT = READINESS_MAX_LEVEL, CRL_COUNT = READINESS_MAX_LEVEL, FRL_COUNT = READINESS_MAX_LEVEL;

type Tip = { icon: typeof Lightbulb; title: string; text: string; type: "info" | "success" | "warning" };

const numFmt = (v: number | null | undefined) => {
  if (v === null || v === undefined || !isFinite(v) || isNaN(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const scoreHue = (s: number) =>
  s >= 70 ? "var(--positive)" : s >= 40 ? "var(--accent-ink)" : s > 0 ? "var(--negative)" : "#3a3a42";

/* Large hero score ring */
const ScoreRing = ({ score, size = 200 }: { score: number; size?: number }) => {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const center = size / 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-ink)" />
            <stop offset="100%" stopColor="var(--positive)" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={center} cy={center} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-origin-display text-6xl font-light text-[var(--ink-1)] leading-none">{Math.round(score)}</span>
        <span className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--ink-3)]">/ 100</span>
      </div>
    </div>
  );
};

/* Horizontal meter bar */
const Meter = ({ name, score, i }: { name: string; score: number; i: number }) => (
  <motion.div
    className="flex items-center gap-4"
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay: i * 0.06, duration: 0.5 }}
  >
    <span className="w-32 shrink-0 text-sm text-[var(--ink-2)]">{name}</span>
    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--band)]">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: scoreHue(score) }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 + i * 0.06, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
    <span className="w-10 shrink-0 text-right font-origin-display text-lg text-[var(--ink-1)]">{Math.round(score)}</span>
  </motion.div>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[12px] uppercase tracking-[0.25em] text-[var(--ink-3)]">{children}</p>
);

const OverallSummary = () => {
  const { evaluation, financial, readiness } = useStartupContext();
  const { berkus, scorecard, riskFactor, vcAnswers, chicagoAnswers } = evaluation;
  const { snapshots } = financial;
  const { trlAnswers, crlAnswers, frlAnswers } = readiness;
  const { t } = useLanguage();

  const trlLevel = useMemo(() => computeReadinessLevel(trlAnswers, "TRL"), [trlAnswers]);
  const crlLevel = useMemo(() => computeReadinessLevel(crlAnswers, "CRL"), [crlAnswers]);
  const frlLevel = useMemo(() => computeReadinessLevel(frlAnswers, "FRL"), [frlAnswers]);

  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const vcValuation = useMemo(() => computeVCValuation(vcAnswers), [vcAnswers]);
  const chicagoValuation = useMemo(() => computeChicagoValuation(chicagoAnswers), [chicagoAnswers]);
  const hasSeedEvaluation = vcValuation > 0 || chicagoValuation > 0;
  const seedAvg = useMemo(() => {
    const vals = [vcValuation, chicagoValuation].filter((v) => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [vcValuation, chicagoValuation]);

  const avgValuation = useMemo(() => {
    const vals = [berkus, scorecard, riskFactor].filter((v) => v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [berkus, scorecard, riskFactor]);

  const hasEvaluation = berkus > 0 || scorecard > 0 || riskFactor > 0;
  const hasFinancial = snapshots.length > 0;
  const hasReadiness = trlLevel > 0 || crlLevel > 0 || frlLevel > 0;
  const hasAnyData = hasEvaluation || hasFinancial || hasReadiness;

  const financialScore = useMemo(() => computeFinancialHealthScore(latestSnapshot), [latestSnapshot]);

  const riskScore = useMemo(() => (!hasEvaluation ? 0 : Math.min(Math.round((avgValuation / 2500000) * 100), 100)), [hasEvaluation, avgValuation]);
  const trlScore = Math.round((trlLevel / TRL_COUNT) * 100);
  const founderScore = useMemo(() => Math.round((crlLevel / CRL_COUNT) * 100), [crlLevel]);
  const investmentScore = useMemo(() => Math.round((frlLevel / FRL_COUNT) * 100), [frlLevel]);
  const maturityScore = useMemo(() => {
    const scores = [financialScore, riskScore, trlScore, founderScore, investmentScore];
    const active = scores.filter((s) => s > 0);
    return active.length > 0 ? Math.round((active.reduce((a, b) => a + b, 0) / active.length) * 0.6) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore]);
  const globalScore = useMemo(() => {
    const all = [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore];
    const active = all.filter((s) => s > 0);
    return active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  }, [financialScore, riskScore, trlScore, founderScore, investmentScore, maturityScore]);

  const modules = [
    { name: t("summary.financial"), score: financialScore },
    { name: t("summary.risk"), score: riskScore },
    { name: "TRL", score: trlScore },
    { name: t("summary.founder"), score: founderScore },
    { name: t("summary.investment"), score: investmentScore },
    { name: t("summary.maturity_label"), score: maturityScore },
  ];

  const getMaturityLabel = (score: number): string => {
    if (score >= 80) return t("summary.scale_up");
    if (score >= 60) return t("summary.growth");
    if (score >= 40) return t("summary.validation");
    if (score >= 20) return t("summary.mvp");
    return t("summary.idea");
  };

  const trlLabels = Array.from({ length: 9 }, (_, i) => t(`trl.${i + 1}.title`));
  const crlLabels = Array.from({ length: 9 }, (_, i) => t(`crl.${i + 1}.title`));
  const frlLabels = Array.from({ length: 9 }, (_, i) => t(`frl.${i + 1}.title`));

  const advice = useMemo((): Tip[] => {
    const tips: Tip[] = [];
    if (!hasAnyData) { tips.push({ icon: AlertTriangle, title: t("summary.no_data"), text: t("summary.no_data_desc"), type: "warning" }); return tips; }
    if (hasEvaluation) {
      if (avgValuation < 1_000_000) tips.push({ icon: AlertTriangle, title: t("summary.low_val"), text: `$${numFmt(avgValuation)} — ${t("summary.low_val_desc")}`, type: "warning" });
      else if (avgValuation < 2_500_000) tips.push({ icon: Lightbulb, title: t("summary.mod_val"), text: `$${numFmt(avgValuation)} — ${t("summary.mod_val_desc")}`, type: "info" });
      else tips.push({ icon: CheckCircle, title: t("summary.strong_val"), text: `$${numFmt(avgValuation)} — ${t("summary.strong_val_desc")}`, type: "success" });
    }
    if (hasFinancial && latestSnapshot) {
      const burnRate = latestSnapshot.revenue.total - latestSnapshot.expenses.total;
      if (burnRate < 0) tips.push({ icon: AlertTriangle, title: t("summary.neg_cashflow"), text: `$${numFmt(Math.abs(burnRate))}/mo. ~${numFmt(latestSnapshot.cashFlow.runway)} ${t("financial.months")} runway.`, type: "warning" });
      else tips.push({ icon: CheckCircle, title: t("summary.pos_cashflow"), text: `$${numFmt(burnRate)}/mo`, type: "success" });
      if (latestSnapshot.customerMetrics.churnRate > 0.1) tips.push({ icon: AlertTriangle, title: t("summary.high_churn"), text: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}%`, type: "warning" });
    }
    if (hasReadiness) {
      if (trlLevel >= 5 && crlLevel < 3) tips.push({ icon: AlertTriangle, title: t("summary.tech_market_gap"), text: t("summary.tech_market_gap_desc"), type: "warning" });
      if (crlLevel >= 4 && frlLevel < 3) tips.push({ icon: Lightbulb, title: t("summary.funding_needed"), text: t("summary.funding_needed_desc"), type: "info" });
    }
    if (hasEvaluation && hasFinancial && hasReadiness && globalScore > 60) tips.push({ icon: Target, title: t("summary.ready_invest"), text: t("summary.ready_invest_desc"), type: "success" });
    if (!hasEvaluation) tips.push({ icon: Lightbulb, title: t("summary.complete_eval"), text: t("summary.complete_eval_desc"), type: "info" });
    if (!hasFinancial) tips.push({ icon: Lightbulb, title: t("summary.add_financial"), text: t("summary.add_financial_desc"), type: "info" });
    if (!hasReadiness) tips.push({ icon: Lightbulb, title: t("summary.assess_readiness"), text: t("summary.assess_readiness_desc"), type: "info" });
    return tips;
  }, [hasAnyData, hasEvaluation, hasFinancial, hasReadiness, avgValuation, latestSnapshot, trlLevel, crlLevel, frlLevel, globalScore, t]);

  const tipAccent = { info: "var(--accent-ink)", success: "var(--positive)", warning: "var(--negative)" };

  const readinessRows = [
    { label: t("summary.technology_trl"), level: trlLevel, max: TRL_COUNT, labels: trlLabels, color: "var(--accent-ink)" },
    { label: t("summary.commercial_crl"), level: crlLevel, max: CRL_COUNT, labels: crlLabels, color: "var(--positive)" },
    { label: t("summary.funding_frl"), level: frlLevel, max: FRL_COUNT, labels: frlLabels, color: "var(--negative)" },
  ];

  // ── AI-generated investment-readiness analysis (grounded in the real metrics) ──
  const [aiLoading, setAiLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const buildPayload = () => ({
    globalScore,
    maturity: getMaturityLabel(globalScore),
    moduleScores: modules.reduce((acc, m) => ({ ...acc, [m.name]: m.score }), {} as Record<string, number>),
    valuation: {
      preSeedAverage: avgValuation,
      berkus, scorecard, riskFactor,
      seedAverage: seedAvg,
      vcMethod: vcValuation,
      chicagoMethod: chicagoValuation,
    },
    financial: latestSnapshot ? {
      revenue: latestSnapshot.revenue.total,
      expenses: latestSnapshot.expenses.total,
      monthlyBurn: latestSnapshot.revenue.total - latestSnapshot.expenses.total,
      runwayMonths: latestSnapshot.cashFlow.runway,
      endingCash: latestSnapshot.cashFlow.endingCash,
      churnRate: latestSnapshot.customerMetrics.churnRate,
      grossMargin: latestSnapshot.customerMetrics.grossMargin,
    } : null,
    readiness: {
      TRL: trlLevel, CRL: crlLevel, FRL: frlLevel, maxLevel: 9,
      trlLabel: trlLevel > 0 ? trlLabels[trlLevel - 1] : null,
      crlLabel: crlLevel > 0 ? crlLabels[crlLevel - 1] : null,
      frlLabel: frlLevel > 0 ? frlLabels[frlLevel - 1] : null,
    },
    completeness: { hasEvaluation, hasFinancial, hasReadiness },
  });

  const runAiSummary = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-venture", {
        body: { type: "summary", data: buildPayload() },
      });
      if (error) throw error;
      setAiAnalysis(data.analysis);
    } catch (e: any) {
      toast({ title: e.message || t("venture.analysis_error"), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // Deep multi-agent orchestration (researcher → validator → analyst → scorer).
  const runDeepAnalysis = async () => {
    setDeepLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orchestrate-analysis", {
        body: { data: buildPayload() },
      });
      if (error) throw error;
      setAiAnalysis(data.report);
    } catch (e: any) {
      toast({ title: e.message || t("venture.analysis_error"), variant: "destructive" });
    } finally {
      setDeepLoading(false);
    }
  };

  return (
    <DashboardLayout title={t("summary.title")} subtitle={t("summary.subtitle")}>
      {/* ── Hero: global health ── */}
      <motion.section
        className="relative overflow-hidden rounded-[28px] border border-[var(--rule)] p-8 sm:p-12 mb-6"
        style={{ background: "linear-gradient(140deg, hsl(220 9% 12%), hsl(220 11% 9%))" }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(132,125,255,0.22), transparent 70%)", filter: "blur(20px)" }} />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <ScoreRing score={globalScore} />
          <div className="text-center md:text-left">
            <Eyebrow>{t("summary.global_health")}</Eyebrow>
            <h2 className="mt-3 font-origin-display font-light text-[var(--ink-1)] text-3xl sm:text-4xl leading-tight max-w-md">
              {t("summary.maturity")}:{" "}
              <span className="italic text-origin-gradient">{getMaturityLabel(globalScore)}</span>
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
              {hasEvaluation && <span className="rounded-full tint-violet px-4 py-1.5 text-xs text-[var(--ink-1)]">Valuation ✓</span>}
              {hasFinancial && <span className="rounded-full tint-ocean px-4 py-1.5 text-xs text-[var(--ink-1)]">Financials ✓</span>}
              {hasReadiness && <span className="rounded-full tint-rose px-4 py-1.5 text-xs text-[var(--ink-1)]">Readiness ✓</span>}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Themed headline cards ── */}
      <div className="grid gap-5 md:grid-cols-3 mb-6">
        {[
          { cls: "card-violet", show: hasEvaluation, label: t("summary.avg_valuation") + " (Pre-Seed)", value: `$${avgValuation.toLocaleString()}`, note: `${t("eval_summary.berkus")} · ${t("eval_summary.scorecard")} · ${t("eval_summary.risk_factor")}` },
          { cls: "card-ocean", show: hasFinancial && !!latestSnapshot, label: t("summary.ending_cash"), value: latestSnapshot ? `$${numFmt(latestSnapshot.cashFlow.endingCash)}` : "—", note: latestSnapshot ? `${numFmt(latestSnapshot.cashFlow.runway)} ${t("financial.months")} runway` : "" },
          { cls: "card-rose", show: hasReadiness, label: t("summary.readiness_levels"), value: `TRL ${trlLevel} · CRL ${crlLevel}`, note: `FRL ${frlLevel} / 9` },
        ].filter((c) => c.show).map((c, i) => (
          <motion.div key={c.label} className={`${c.cls} rounded-3xl p-7`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}>
            <p className="text-[13px] font-medium text-[var(--ink-1)]">{c.label}</p>
            <p className="mt-3 font-origin-display text-3xl font-medium text-[var(--ink-1)]">{c.value}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-2)]">{c.note}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Module breakdown (meters) ── */}
      <motion.section className="rounded-3xl border border-[var(--rule)] bg-card p-8 mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <Eyebrow>{t("summary.module_comparison")}</Eyebrow>
        <div className="mt-7 space-y-5">
          {modules.map((m, i) => <Meter key={m.name} name={m.name} score={m.score} i={i} />)}
        </div>
      </motion.section>

      {/* ── Readiness detail ── */}
      {hasReadiness && (
        <div className="grid gap-5 sm:grid-cols-3 mb-6">
          {readinessRows.map((r, i) => (
            <motion.div key={r.label} className="rounded-3xl border border-[var(--rule)] bg-card p-6"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
              <p className="text-xs text-[var(--ink-3)]">{r.label}</p>
              <p className="mt-2 font-origin-display text-3xl font-light text-[var(--ink-1)]">
                {r.level} <span className="text-[var(--ink-3)] text-xl">/ {r.max}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--ink-2)]">{r.level > 0 ? r.labels[r.level - 1] : t("summary.not_started")}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--band)]">
                <motion.div className="h-full rounded-full" style={{ background: r.color }}
                  initial={{ width: 0 }} animate={{ width: `${(r.level / r.max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Financial report tiles ── */}
      {hasFinancial && latestSnapshot && (
        <motion.section className="rounded-3xl border border-[var(--rule)] bg-card p-8 mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Eyebrow>{t("summary.financial_report")}</Eyebrow>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl bg-[var(--band)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("summary.total_revenue"), value: `$${numFmt(latestSnapshot.revenue.total)}`, icon: TrendingUp, up: true },
              { label: t("summary.total_expenses"), value: `$${numFmt(latestSnapshot.expenses.total)}`, icon: TrendingDown, up: false },
              { label: t("summary.ending_cash"), value: `$${numFmt(latestSnapshot.cashFlow.endingCash)}`, icon: Wallet, up: latestSnapshot.cashFlow.endingCash > 0 },
              { label: t("summary.active_users"), value: numFmt(latestSnapshot.customerMetrics.activeUsers), icon: Users, up: true },
              { label: "ARPU", value: `$${numFmt(latestSnapshot.customerMetrics.arpu)}`, icon: DollarSign, up: true },
              { label: t("summary.churn_rate"), value: `${numFmt(latestSnapshot.customerMetrics.churnRate * 100)}%`, icon: AlertTriangle, up: latestSnapshot.customerMetrics.churnRate < 0.05 },
              { label: t("summary.burn_rate"), value: `$${numFmt(latestSnapshot.cashFlow.monthlyBurnRate)}`, icon: TrendingDown, up: latestSnapshot.cashFlow.monthlyBurnRate > 0 },
              { label: "CLTV", value: `$${numFmt(latestSnapshot.customerMetrics.cltv)}`, icon: Target, up: true },
            ].map((m) => (
              <div key={m.label} className="bg-card p-5">
                <div className="flex items-center gap-2 text-[var(--ink-3)]">
                  <m.icon className="h-4 w-4" style={{ color: m.up ? "var(--positive)" : "var(--negative)" }} />
                  <span className="text-xs">{m.label}</span>
                </div>
                <p className="mt-2 font-origin-display text-xl text-[var(--ink-1)]">{m.value}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Valuation results ── */}
      {hasEvaluation && (
        <motion.section className="rounded-3xl border border-[var(--rule)] bg-card p-8 mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Eyebrow>{t("summary.valuation_results")}</Eyebrow>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              { method: t("eval_summary.berkus"), value: berkus, color: "var(--accent-ink)" },
              { method: t("eval_summary.scorecard"), value: scorecard, color: "var(--positive)" },
              { method: t("eval_summary.risk_factor"), value: riskFactor, color: "var(--negative)" },
            ].map((v) => (
              <div key={v.method} className="rounded-2xl bg-[var(--band)] p-5 text-center">
                <p className="text-xs text-[var(--ink-3)]">{v.method}</p>
                <p className="mt-2 font-origin-display text-2xl" style={{ color: v.color }}>${v.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── Seed valuation ── */}
      {hasSeedEvaluation && (
        <motion.section className="rounded-3xl border border-[var(--rule)] bg-card p-8 mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <Eyebrow>{t("summary.seed_valuation_results")}</Eyebrow>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {vcValuation > 0 && (
              <div className="rounded-2xl bg-[var(--band)] p-5 text-center">
                <p className="text-xs text-[var(--ink-3)]">{t("seed_summary.vc_method")}</p>
                <p className="mt-2 font-origin-display text-2xl text-[var(--accent-ink)]">${vcValuation.toLocaleString()}</p>
              </div>
            )}
            {chicagoValuation > 0 && (
              <div className="rounded-2xl bg-[var(--band)] p-5 text-center">
                <p className="text-xs text-[var(--ink-3)]">{t("seed_summary.chicago_method")}</p>
                <p className="mt-2 font-origin-display text-2xl text-[var(--positive)]">${chicagoValuation.toLocaleString()}</p>
              </div>
            )}
            <div className="rounded-2xl tint-ocean p-5 text-center">
              <p className="text-xs text-[var(--ink-2)]">{t("summary.avg_valuation")} (Seed)</p>
              <p className="mt-2 font-origin-display text-2xl text-[var(--ink-1)]">${seedAvg.toLocaleString()}</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Recommendations ── */}
      <section>
        <h3 className="font-origin-display text-2xl font-light text-[var(--ink-1)] mb-5">{t("summary.recommendations")}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {advice.map((tip, i) => (
            <motion.div key={i}
              className="flex items-start gap-4 rounded-2xl border border-[var(--rule)] bg-card p-5"
              style={{ borderLeft: `2px solid ${tipAccent[tip.type]}` }}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.5 }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${tipAccent[tip.type]}1f` }}>
                <tip.icon className="h-4 w-4" style={{ color: tipAccent[tip.type] }} />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--ink-1)]">{tip.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-2)] font-light">{tip.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── AI investment-readiness analysis ── */}
      <section className="mt-6">
        <div className="rounded-3xl border border-[var(--rule)] bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(132,125,255,0.14)" }}>
                <Sparkles className="h-5 w-5 text-[var(--accent-ink)]" />
              </div>
              <div>
                <h3 className="font-origin-display text-xl font-light text-[var(--ink-1)]">{t("summary.ai_title")}</h3>
                <p className="mt-1 text-sm text-[var(--ink-2)] font-light">{t("summary.ai_desc")}</p>
                <Link
                  to="/analyst"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--accent-ink)] transition-colors hover:text-[#a49dff]"
                >
                  {t("summary.ai_analyst_cta")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                onClick={runAiSummary}
                disabled={aiLoading || deepLoading || !hasAnyData}
                variant="outline"
                className="gap-2 rounded-xl"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? t("summary.ai_analyzing") : aiAnalysis ? t("summary.ai_regenerate") : t("summary.ai_generate")}
              </Button>
              <Button
                onClick={runDeepAnalysis}
                disabled={aiLoading || deepLoading || !hasAnyData}
                className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground border-0 font-semibold"
              >
                {deepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {deepLoading ? t("summary.ai_deep_running") : t("summary.ai_deep")}
              </Button>
            </div>
          </div>

          {!hasAnyData && (
            <p className="mt-5 text-sm text-[var(--ink-3)]">{t("summary.no_data_desc")}</p>
          )}

          {aiAnalysis && (
            <div
              className="prose prose-sm prose-invert max-w-none mt-6 border-t border-[var(--rule)] pt-6 text-[var(--ink-1)]"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAnalysis) }}
            />
          )}
        </div>
      </section>
    </DashboardLayout>
  );
};

export default OverallSummary;
