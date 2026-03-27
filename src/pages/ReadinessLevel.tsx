import DashboardLayout from "@/components/DashboardLayout";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Cpu, ShoppingCart, Landmark, ChevronRight, Lock, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStartupContext } from "@/context/StartupContext";

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

const TRL_LEVELS: Level[] = [
  { level: 1, title: "Fundamental Concept", criteria: [
    { type: "M", text: "The problem and technology concept are clearly documented" },
    { type: "S", text: "Scientific or technical rationale is identified" },
    { type: "S", text: "Alternative technologies or approaches are analyzed" },
  ]},
  { level: 2, title: "Defined Concept", criteria: [
    { type: "M", text: "Technical solution concept is documented" },
    { type: "M", text: "Initial system architecture is defined" },
    { type: "S", text: "Key technical risks are identified" },
  ]},
  { level: 3, title: "Proof of Concept", criteria: [
    { type: "M", text: "Technology principle demonstrated in laboratory conditions" },
    { type: "M", text: "Test results documented" },
    { type: "S", text: "Technical limitations identified" },
  ]},
  { level: 4, title: "Laboratory Prototype", criteria: [
    { type: "M", text: "Initial prototype or MVP exists" },
    { type: "M", text: "Functional tests conducted" },
    { type: "S", text: "System performance measured" },
  ]},
  { level: 5, title: "Relevant Environment Testing", criteria: [
    { type: "M", text: "Prototype tested in relevant environment" },
    { type: "M", text: "Initial user feedback collected" },
    { type: "S", text: "Key performance indicators measured" },
  ]},
  { level: 6, title: "Pilot with Real Users", criteria: [
    { type: "M", text: "Pilot testing conducted with real users" },
    { type: "M", text: "System operates reliably" },
    { type: "S", text: "Major technical risks reduced" },
  ]},
  { level: 7, title: "Operational Prototype", criteria: [
    { type: "M", text: "System used in real operational environment" },
    { type: "M", text: "Monitoring and control mechanisms implemented" },
    { type: "S", text: "Technical support process established" },
  ]},
  { level: 8, title: "Certified Product", criteria: [
    { type: "M", text: "Product complies with technical and regulatory standards" },
    { type: "M", text: "Certification or compliance documentation available" },
    { type: "S", text: "Stable operational performance achieved" },
  ]},
  { level: 9, title: "Commercial Deployment", criteria: [
    { type: "M", text: "Product actively used in the market" },
    { type: "M", text: "Active customer base exists" },
    { type: "S", text: "Technical risks are minimal" },
  ]},
];

const CRL_LEVELS: Level[] = [
  { level: 1, title: "Problem Validation", criteria: [
    { type: "M", text: "Customer problem validated with real users" },
    { type: "S", text: "Competing solutions analyzed" },
  ]},
  { level: 2, title: "Value Proposition", criteria: [
    { type: "M", text: "Value proposition defined" },
    { type: "M", text: "Target customer segment identified" },
    { type: "S", text: "Initial market size estimated" },
  ]},
  { level: 3, title: "MVP Testing", criteria: [
    { type: "M", text: "MVP tested with customers" },
    { type: "M", text: "Customer feedback collected" },
    { type: "S", text: "Customer willingness to pay evaluated" },
  ]},
  { level: 4, title: "First Sale", criteria: [
    { type: "M", text: "First real sale completed" },
    { type: "M", text: "Customer acquisition channel identified" },
    { type: "S", text: "Customer acquisition cost estimated" },
  ]},
  { level: 5, title: "Repeat Customers", criteria: [
    { type: "M", text: "At least three paying customers acquired" },
    { type: "M", text: "Repeat purchases observed" },
    { type: "S", text: "Unit economics calculated" },
  ]},
  { level: 6, title: "Growth Metrics", criteria: [
    { type: "M", text: "Customer lifetime value exceeds acquisition cost" },
    { type: "M", text: "Monthly growth in users or sales observed" },
    { type: "S", text: "Marketing strategy optimized" },
  ]},
  { level: 7, title: "Investment Ready", criteria: [
    { type: "M", text: "3–5 year financial projection prepared" },
    { type: "M", text: "Investor pitch deck available" },
    { type: "S", text: "Initial investor interest identified" },
  ]},
  { level: 8, title: "Market Expansion", criteria: [
    { type: "M", text: "New market segments or geographies identified" },
    { type: "M", text: "Scalable sales process established" },
    { type: "S", text: "Strategic partnerships formed for distribution" },
  ]},
  { level: 9, title: "Sustainable Growth", criteria: [
    { type: "M", text: "Consistent revenue growth over 6+ months" },
    { type: "M", text: "Brand recognition established in target market" },
    { type: "S", text: "Customer referral or organic growth channel active" },
  ]},
];

const FRL_LEVELS: Level[] = [
  { level: 1, title: "Idea Stage", criteria: [
    { type: "M", text: "Business idea documented" },
    { type: "S", text: "Basic understanding of funding options" },
  ]},
  { level: 2, title: "Financial Planning", criteria: [
    { type: "M", text: "Funding needs identified" },
    { type: "M", text: "Initial financial plan prepared" },
    { type: "S", text: "Potential funding sources mapped" },
  ]},
  { level: 3, title: "First Funding", criteria: [
    { type: "M", text: "Commercial verification plan defined" },
    { type: "M", text: "First small soft funding obtained" },
    { type: "S", text: "Basic financial planning knowledge exists" },
  ]},
  { level: 4, title: "Pitch Preparation", criteria: [
    { type: "M", text: "Short business pitch prepared" },
    { type: "M", text: "12–18 month funding plan prepared" },
    { type: "S", text: "List of potential investors created" },
  ]},
  { level: 5, title: "Investor Materials", criteria: [
    { type: "M", text: "Investor pitch deck prepared" },
    { type: "M", text: "Financial projections developed" },
    { type: "S", text: "Grant or loan applications prepared" },
  ]},
  { level: 6, title: "Investment Offer", criteria: [
    { type: "M", text: "Investment offer defined (amount, valuation, use of funds)" },
    { type: "M", text: "Basic understanding of equity financing" },
    { type: "S", text: "Initial investor meetings conducted" },
  ]},
  { level: 7, title: "Investor Discussions", criteria: [
    { type: "M", text: "Active discussions with investors ongoing" },
    { type: "M", text: "Complete business plan prepared" },
    { type: "S", text: "Team aligned on investment strategy" },
  ]},
  { level: 8, title: "Governance Ready", criteria: [
    { type: "M", text: "Company structure and governance organized" },
    { type: "M", text: "All key investor materials prepared" },
    { type: "S", text: "Term sheet discussions in progress" },
  ]},
  { level: 9, title: "Funded", criteria: [
    { type: "M", text: "Investment agreement signed" },
    { type: "M", text: "Investment funds received" },
    { type: "S", text: "Next funding round strategy planned" },
  ]},
];

type Answers = Record<string, boolean>;

function isLevelCompleted(level: Level, answers: Answers, prefix: string): boolean {
  const mandatory = level.criteria.filter(c => c.type === "M");

  const allMandatory = mandatory.every((_, i) => {
    const key = `${prefix}-${level.level}-M-${i}`;
    return answers[key] === true;
  });

  // Level is completed when all mandatory criteria are met
  return allMandatory;
}

function allMandatoryMet(level: Level, answers: Answers, prefix: string): boolean {
  const mandatory = level.criteria.filter(c => c.type === "M");
  return mandatory.every((_, i) => {
    const key = `${prefix}-${level.level}-M-${i}`;
    return answers[key] === true;
  });
}

function getFinalLevel(levels: Level[], answers: Answers, prefix: string): number {
  let finalLevel = 0;
  for (const level of levels) {
    if (isLevelCompleted(level, answers, prefix)) {
      finalLevel = level.level;
    } else {
      break;
    }
  }
  return finalLevel;
}

function getMaxUnlockedLevel(levels: Level[], answers: Answers, prefix: string, finalLevel: number): number {
  // The first incomplete level is always unlocked (finalLevel index)
  // Beyond that, unlock next level only if current level has all mandatory met
  let maxUnlocked = finalLevel;
  for (let i = finalLevel; i < levels.length; i++) {
    maxUnlocked = i;
    if (!allMandatoryMet(levels[i], answers, prefix)) {
      break;
    }
  }
  return Math.min(maxUnlocked, levels.length - 1);
}

const ReadinessAssessment = ({
  levels, prefix, icon: Icon, color, answers, setAnswers,
}: {
  levels: Level[];
  prefix: string;
  icon: React.ElementType;
  color: string;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) => {
  const toggle = (key: string) => {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const finalLevel = useMemo(() => getFinalLevel(levels, answers, prefix), [levels, answers, prefix]);
  const maxUnlocked = useMemo(() => getMaxUnlockedLevel(levels, answers, prefix, finalLevel), [levels, answers, prefix, finalLevel]);
  const maxLevel = levels.length;
  const progressPercent = (finalLevel / maxLevel) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Current Level: <span className="text-gradient">{finalLevel}</span> / {maxLevel}
            </h3>
            <p className="text-sm text-muted-foreground">
              {finalLevel === 0
                ? "Complete Level 1 to begin"
                : `${levels[finalLevel - 1].title} completed`}
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
              <p><strong>Completion Rule:</strong> All Mandatory (M) criteria must be satisfied, and at least 70% of Supportive (S) criteria must be met. Levels are evaluated sequentially.</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">Hover for scoring rules</span>
        </div>
      </div>

      {/* Level Cards */}
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
                isCompleted
                  ? "border-accent/50 bg-accent/5"
                  : isCurrent
                  ? "border-primary/50 bg-primary/5 shadow-card"
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
                    Level {level.level} – {level.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Mandatory: {mandatoryMet}/{mandatoryIdxs.length} · Supportive: {supportiveMet}/{supportiveIdxs.length}
                  </p>
                </div>
                {isCompleted && (
                  <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                    Completed
                  </span>
                )}
              </div>

              {!isLocked && (
                <div className="space-y-2 ml-8">
                  {level.criteria.map((criterion, i) => {
                    const key = `${prefix}-${level.level}-${criterion.type}-${criterion.type === "M" ? mandatoryIdxs.indexOf(i) !== -1 ? mandatoryIdxs.indexOf(i) : i : supportiveIdxs.indexOf(i) !== -1 ? supportiveIdxs.indexOf(i) : i}`;
                    // Recalculate key properly
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
                          {criterion.type === "M" ? "Mandatory" : "Supportive"}
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

  return (
    <DashboardLayout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Startup Readiness Level Assessment</h1>
          <p className="mt-2 text-muted-foreground">
            Assess your startup across three dimensions: Technology, Commercial, and Funding readiness. Each level must be completed sequentially.
          </p>
        </div>

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
            <ReadinessAssessment levels={TRL_LEVELS} prefix="TRL" icon={Cpu} color="gradient-primary" answers={trlAnswers} setAnswers={setTrlAnswers} />
          </TabsContent>
          <TabsContent value="crl">
            <ReadinessAssessment levels={CRL_LEVELS} prefix="CRL" icon={ShoppingCart} color="gradient-primary" answers={crlAnswers} setAnswers={setCrlAnswers} />
          </TabsContent>
          <TabsContent value="frl">
            <ReadinessAssessment levels={FRL_LEVELS} prefix="FRL" icon={Landmark} color="gradient-primary" answers={frlAnswers} setAnswers={setFrlAnswers} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ReadinessLevel;
