import DashboardLayout from "@/components/DashboardLayout";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Cpu, ShoppingCart, Landmark, ChevronRight, Lock, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStartupContext } from "@/context/StartupContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  READINESS_CRITERIA, computeMaxUnlockedLevel, computeReadinessLevel,
  type ReadinessAnswers, type ReadinessPrefix,
} from "@/lib/analyst/methodologies/readiness";

type CriterionType = "M" | "S";

interface Criterion {
  type: CriterionType;
  text: string;
}

interface Level {
  level: number;
  title: string;
  criteria: Criterion[];
}

// Criteria counts and the level-progression rules are shared with the
// readiness agent and the overall summary — see
// `src/lib/analyst/methodologies/readiness.ts`.
function buildLevels(prefix: ReadinessPrefix, t: (k: string) => string): Level[] {
  const p = prefix.toLowerCase();
  return READINESS_CRITERIA[prefix].map(([mandatory, supportive], i) => {
    const lvl = i + 1;
    const criteria: Criterion[] = [];
    for (let j = 0; j < mandatory; j++) criteria.push({ type: "M", text: t(`${p}.${lvl}.m${j}`) });
    for (let j = 0; j < supportive; j++) criteria.push({ type: "S", text: t(`${p}.${lvl}.s${j}`) });
    return { level: lvl, title: t(`${p}.${lvl}.title`), criteria };
  });
}

type Answers = ReadinessAnswers;

const ReadinessAssessment = ({
  levels, prefix, icon: Icon, color, answers, setAnswers,
}: {
  levels: Level[]; prefix: ReadinessPrefix; icon: React.ElementType; color: string;
  answers: Answers; setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) => {
  const { t } = useLanguage();
  const toggle = (key: string) => setAnswers(prev => ({ ...prev, [key]: !prev[key] }));

  const finalLevel = useMemo(() => computeReadinessLevel(answers, prefix), [answers, prefix]);
  const maxUnlocked = useMemo(() => computeMaxUnlockedLevel(answers, prefix, finalLevel), [answers, prefix, finalLevel]);
  const maxLevel = levels.length;
  const progressPercent = (finalLevel / maxLevel) * 100;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {t("readiness.current_level")}: <span className="text-gradient">{finalLevel}</span> / {maxLevel}
            </h3>
            <p className="text-sm text-muted-foreground">
              {finalLevel === 0
                ? t("readiness.complete_l1")
                : `${levels[finalLevel - 1].title} ${t("readiness.completed")}`}
            </p>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex items-center gap-2 mt-3">
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              <p><strong>{t("readiness.completion_rule")}:</strong> {t("readiness.completion_desc")}</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">{t("readiness.hover_rules")}</span>
        </div>
      </div>

      <div className="space-y-4">
        {levels.map((level, levelIdx) => {
          const isCompleted = levelIdx < finalLevel;
          const isCurrent = levelIdx === finalLevel;
          const isLocked = levelIdx > maxUnlocked;

          const mandatoryIdxs: number[] = [];
          const supportiveIdxs: number[] = [];
          level.criteria.forEach((c, i) => {
            if (c.type === "M") mandatoryIdxs.push(i);
            else supportiveIdxs.push(i);
          });

          const mandatoryMet = mandatoryIdxs.filter(i => answers[`${prefix}-${level.level}-M-${i}`]).length;
          const supportiveMet = supportiveIdxs.filter(i => answers[`${prefix}-${level.level}-S-${i}`]).length;

          return (
            <div
              key={level.level}
              className={`rounded-xl border p-5 transition-all ${
                isCompleted ? "border-accent/50 bg-accent/5"
                  : isCurrent ? "border-primary/50 bg-primary/5 shadow-card"
                  : "border-border bg-card/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                ) : isLocked ? (
                  <Lock className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("readiness.level")} {level.level} – {level.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("readiness.mandatory")}: {mandatoryMet}/{mandatoryIdxs.length} · {t("readiness.supportive")}: {supportiveMet}/{supportiveIdxs.length}
                  </p>
                </div>
                {isCompleted && (
                  <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                    {t("readiness.completed_badge")}
                  </span>
                )}
              </div>

              {!isLocked && (
                <div className="space-y-2 ml-8">
                  {level.criteria.map((criterion, i) => {
                    let mCount = 0;
                    let sCount = 0;
                    let actualKey = "";
                    for (let j = 0; j <= i; j++) {
                      if (level.criteria[j].type === "M") {
                        if (j === i) actualKey = `${prefix}-${level.level}-M-${mCount}`;
                        mCount++;
                      } else {
                        if (j === i) actualKey = `${prefix}-${level.level}-S-${sCount}`;
                        sCount++;
                      }
                    }
                    const checked = answers[actualKey] === true;

                    return (
                      <button
                        key={i}
                        onClick={() => toggle(actualKey)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                          checked
                            ? "bg-accent/10 border border-accent/30"
                            : "bg-muted/50 border border-transparent hover:border-border hover:bg-muted"
                        }`}
                      >
                        {checked ? (
                          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}>
                          {criterion.text}
                        </span>
                        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                          criterion.type === "M"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {criterion.type === "M" ? t("readiness.mandatory") : t("readiness.supportive")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReadinessLevel = () => {
  const { readiness } = useStartupContext();
  const { trlAnswers, crlAnswers, frlAnswers, setTrlAnswers, setCrlAnswers, setFrlAnswers } = readiness;
  const { t } = useLanguage();

  const trlLevels = useMemo(() => buildLevels("TRL", t), [t]);
  const crlLevels = useMemo(() => buildLevels("CRL", t), [t]);
  const frlLevels = useMemo(() => buildLevels("FRL", t), [t]);

  return (
    <DashboardLayout title={t("readiness.title")} subtitle={t("readiness.subtitle")}>
      <Tabs defaultValue="trl" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1 flex-wrap">
          <TabsTrigger value="trl" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card gap-2">
            <Cpu className="h-4 w-4" /> TRL
          </TabsTrigger>
          <TabsTrigger value="crl" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card gap-2">
            <ShoppingCart className="h-4 w-4" /> CRL
          </TabsTrigger>
          <TabsTrigger value="frl" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-card gap-2">
            <Landmark className="h-4 w-4" /> FRL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trl">
          <ReadinessAssessment levels={trlLevels} prefix="TRL" icon={Cpu} color="gradient-primary" answers={trlAnswers} setAnswers={setTrlAnswers} />
        </TabsContent>
        <TabsContent value="crl">
          <ReadinessAssessment levels={crlLevels} prefix="CRL" icon={ShoppingCart} color="gradient-primary" answers={crlAnswers} setAnswers={setCrlAnswers} />
        </TabsContent>
        <TabsContent value="frl">
          <ReadinessAssessment levels={frlLevels} prefix="FRL" icon={Landmark} color="gradient-primary" answers={frlAnswers} setAnswers={setFrlAnswers} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ReadinessLevel;
