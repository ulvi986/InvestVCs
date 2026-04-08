import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import BerkusMethod from "@/components/BerkusMethod";
import ScorecardMethod from "@/components/ScorecardMethod";
import RiskFactorMethod from "@/components/RiskFactorMethod";
import EvaluationSummary from "@/components/EvaluationSummary";
import SeedValuation from "@/components/SeedValuation";
import SeedEvaluationSummary from "@/components/SeedEvaluationSummary";
import VCMethod from "@/components/VCMethod";
import { useStartupContext } from "@/context/StartupContext";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const PRE_SEED_TABS = ["berkus", "scorecard", "risk", "summary"] as const;
const SEED_TABS = ["vc", "chicago", "summary"] as const;

const TabNav = ({
  tabs,
  current,
  onChange,
  t,
}: {
  tabs: readonly string[];
  current: string;
  onChange: (tab: string) => void;
  t: (key: string) => string;
}) => {
  const idx = tabs.indexOf(current);
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
      <Button variant="outline" onClick={() => onChange(tabs[idx - 1])} disabled={idx <= 0} className="gap-2">
        <ChevronLeft className="h-4 w-4" /> {t("eval.back")}
      </Button>
      <span className="text-sm text-muted-foreground">{idx + 1} / {tabs.length}</span>
      <Button onClick={() => onChange(tabs[idx + 1])} disabled={idx >= tabs.length - 1} className="gap-2 gradient-primary text-primary-foreground border-0">
        {t("eval.next")} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StartupEvaluation = () => {
  const { evaluation } = useStartupContext();
  const {
    berkus, scorecard, riskFactor,
    berkusAnswers, scorecardAnswers, scorecardMedian, riskAnswers, vcAnswers, chicagoAnswers,
    setBerkus, setScorecard, setRiskFactor,
    setBerkusAnswers, setScorecardAnswers, setScorecardMedian, setRiskAnswers, setVcAnswers, setChicagoAnswers,
  } = evaluation;
  const { t } = useLanguage();
  const [stage, setStage] = useState<"pre-seed" | "seed">("pre-seed");
  const [vcValue, setVcValue] = useState(0);
  const [chicagoValue, setChicagoValue] = useState(0);
  const [preSeedTab, setPreSeedTab] = useState<string>("berkus");
  const [seedTab, setSeedTab] = useState<string>("vc");

  return (
    <DashboardLayout title={t("eval.title")} subtitle={t("eval.subtitle")}>
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setStage("pre-seed")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            stage === "pre-seed"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {t("eval.preseed")}
        </button>
        <button
          onClick={() => setStage("seed")}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            stage === "seed"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {t("eval.seed")}
        </button>
      </div>

      {stage === "pre-seed" ? (
        <Tabs value={preSeedTab} onValueChange={setPreSeedTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="berkus" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.berkus_tab")}</TabsTrigger>
            <TabsTrigger value="scorecard" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.scorecard_tab")}</TabsTrigger>
            <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.risk_tab")}</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.summary_tab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="berkus">
            <BerkusMethod scores={berkusAnswers} onScoresChange={setBerkusAnswers} onValuationChange={setBerkus} />
            <TabNav tabs={PRE_SEED_TABS} current="berkus" onChange={setPreSeedTab} t={t} />
          </TabsContent>
          <TabsContent value="scorecard">
            <ScorecardMethod scores={scorecardAnswers} medianValuation={scorecardMedian} onScoresChange={setScorecardAnswers} onMedianChange={setScorecardMedian} onValuationChange={setScorecard} />
            <TabNav tabs={PRE_SEED_TABS} current="scorecard" onChange={setPreSeedTab} t={t} />
          </TabsContent>
          <TabsContent value="risk">
            <RiskFactorMethod scores={riskAnswers} onScoresChange={setRiskAnswers} onValuationChange={setRiskFactor} />
            <TabNav tabs={PRE_SEED_TABS} current="risk" onChange={setPreSeedTab} t={t} />
          </TabsContent>
          <TabsContent value="summary">
            <EvaluationSummary berkus={berkus} scorecard={scorecard} riskFactor={riskFactor} />
            <TabNav tabs={PRE_SEED_TABS} current="summary" onChange={setPreSeedTab} t={t} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={seedTab} onValueChange={setSeedTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="vc" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.vc_tab")}</TabsTrigger>
            <TabsTrigger value="chicago" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.chicago_tab")}</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card">{t("eval.summary_tab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="vc">
            <VCMethod answers={vcAnswers} onAnswersChange={setVcAnswers} onValuationChange={setVcValue} />
            <TabNav tabs={SEED_TABS} current="vc" onChange={setSeedTab} t={t} />
          </TabsContent>
          <TabsContent value="chicago">
            <SeedValuation answers={chicagoAnswers} onAnswersChange={setChicagoAnswers} onValuationChange={setChicagoValue} />
            <TabNav tabs={SEED_TABS} current="chicago" onChange={setSeedTab} t={t} />
          </TabsContent>
          <TabsContent value="summary">
            <SeedEvaluationSummary vcMethod={vcValue} chicagoMethod={chicagoValue} />
            <TabNav tabs={SEED_TABS} current="summary" onChange={setSeedTab} t={t} />
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default StartupEvaluation;
