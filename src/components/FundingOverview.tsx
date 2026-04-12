import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  DollarSign, Save, Loader2, Lightbulb, Gauge, Plus, Trash2
} from "lucide-react";

interface FundingData {
  funding_raised: number;
  funding_goal: number;
  funding_stage: string;
  last_round_amount: number;
  last_round_date: string;
  last_round_investor_type: string;
  use_product_pct: number;
  use_marketing_pct: number;
  use_team_pct: number;
  valuation: number;
  timeline: string;
  interest_count: number;
}

interface FundingRound {
  id?: string;
  round_name: string;
  amount: number;
  investor_name: string;
  date: string;
}

const ROUND_OPTIONS = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D"];

const defaultFunding: FundingData = {
  funding_raised: 0, funding_goal: 0, funding_stage: "pre-seed",
  last_round_amount: 0, last_round_date: "", last_round_investor_type: "",
  use_product_pct: 0, use_marketing_pct: 0, use_team_pct: 0,
  valuation: 0, timeline: "", interest_count: 0,
};

const FundingOverview = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [funding, setFunding] = useState<FundingData>(defaultFunding);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [fRes, rRes] = await Promise.all([
        supabase.from("startup_funding").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("funding_rounds" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      if (fRes.data) {
        const d = fRes.data as any;
        setFunding({
          funding_raised: Number(d.funding_raised) || 0,
          funding_goal: Number(d.funding_goal) || 0,
          funding_stage: d.funding_stage || "pre-seed",
          last_round_amount: Number(d.last_round_amount) || 0,
          last_round_date: d.last_round_date || "",
          last_round_investor_type: d.last_round_investor_type || "",
          use_product_pct: Number(d.use_product_pct) || 0,
          use_marketing_pct: Number(d.use_marketing_pct) || 0,
          use_team_pct: Number(d.use_team_pct) || 0,
          valuation: Number(d.valuation) || 0,
          timeline: d.timeline || "",
          interest_count: Number(d.interest_count) || 0,
        });
      }
      setRounds((rRes.data as any[])?.map((r: any) => ({
        id: r.id,
        round_name: r.round_name,
        amount: Number(r.amount) || 0,
        investor_name: r.investor_name || "",
        date: r.date || "",
      })) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const addRound = () => {
    setRounds(prev => [...prev, { round_name: "Pre-Seed", amount: 0, investor_name: "", date: "" }]);
  };

  const removeRound = (index: number) => {
    const round = rounds[index];
    if (round.id) {
      supabase.from("funding_rounds" as any).delete().eq("id", round.id).then(() => {});
    }
    setRounds(prev => prev.filter((_, i) => i !== index));
  };

  const updateRound = (index: number, field: keyof FundingRound, value: string | number) => {
    setRounds(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Calculate total raised from rounds
    const totalRaised = rounds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const updatedFunding = { ...funding, funding_raised: totalRaised };

    const payload = { user_id: user.id, ...updatedFunding } as any;
    const { error: fErr } = await supabase.from("startup_funding").upsert(payload, { onConflict: "user_id" });

    // Save rounds
    for (const round of rounds) {
      const roundPayload = {
        user_id: user.id,
        round_name: round.round_name,
        amount: Number(round.amount) || 0,
        investor_name: round.investor_name || null,
        date: round.date || null,
      } as any;

      if (round.id) {
        await supabase.from("funding_rounds" as any).update(roundPayload).eq("id", round.id);
      } else {
        const { data } = await supabase.from("funding_rounds" as any).insert(roundPayload).select().single();
        if (data) round.id = (data as any).id;
      }
    }

    setSaving(false);
    if (fErr) {
      console.error("Funding save error:", fErr);
      toast.error(t("common.loading"));
    } else {
      setFunding(updatedFunding);
      toast.success(t("profile.save") + " ✓");
      setEditing(false);
    }
  };

  const totalRaised = rounds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const pct = funding.funding_goal > 0 ? Math.min(100, Math.round((totalRaised / funding.funding_goal) * 100)) : 0;

  const readinessScore = Math.min(100, Math.round(
    (totalRaised > 0 ? 20 : 0) +
    (funding.funding_goal > 0 ? 10 : 0) +
    (rounds.length > 0 ? 15 : 0) +
    (funding.valuation > 0 ? 20 : 0) +
    ((funding.use_product_pct + funding.use_marketing_pct + funding.use_team_pct) > 0 ? 15 : 0) +
    (funding.funding_stage !== "pre-seed" ? 10 : 5) +
    (funding.timeline ? 10 : 0)
  ));

  const getInsight = (): string => {
    if (totalRaised === 0 && funding.funding_goal > 0) return t("funding.insight_no_funding");
    if (pct >= 80) return t("funding.insight_almost_funded");
    if (pct >= 50) return t("funding.insight_half_funded");
    if (rounds.length > 0) return t("funding.insight_recent_round");
    return t("funding.insight_early_stage");
  };

  // Bar colors for rounds
  const ROUND_COLORS = [
    "bg-primary", "bg-accent", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500"
  ];

  const maxRoundAmount = Math.max(...rounds.map(r => Number(r.amount) || 0), 1);

  if (loading) return null;

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" /> {t("funding.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {readinessScore > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">{readinessScore}/100</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? t("eval.back") : "✏️"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("funding.raised")}</span>
            <span className="font-bold text-foreground">₼{totalRaised.toLocaleString()} / ₼{funding.funding_goal.toLocaleString()}</span>
          </div>
          <Progress value={pct} className="h-4" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{pct}% {t("funding.funded")}</p>
        </div>

        {/* Funding Rounds Bar Chart (always visible) */}
        {rounds.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3">{t("funding.rounds_title")}</p>
            <div className="space-y-2">
              {rounds.map((round, i) => (
                <div key={round.id || i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{round.round_name}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ROUND_COLORS[i % ROUND_COLORS.length]} transition-all`}
                      style={{ width: `${Math.max(2, (Number(round.amount) / maxRoundAmount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-24 text-right">₼{Number(round.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {editing ? (
          <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
            {/* Funding Rounds Editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">{t("funding.rounds_title")}</Label>
                <Button variant="outline" size="sm" onClick={addRound} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> {t("funding.add_round")}
                </Button>
              </div>
              <div className="space-y-3">
                {rounds.map((round, i) => (
                  <div key={round.id || i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px]">{t("funding.round_name")}</Label>
                      <Select value={round.round_name} onValueChange={v => updateRound(i, "round_name", v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROUND_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{t("funding.round_amount")}</Label>
                      <Input type="number" className="h-9 text-xs" value={round.amount || ""} onChange={e => updateRound(i, "amount", Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{t("funding.round_investor")}</Label>
                      <Input className="h-9 text-xs" value={round.investor_name} onChange={e => updateRound(i, "investor_name", e.target.value)} placeholder="—" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">{t("funding.round_date")}</Label>
                      <Input type="date" className="h-9 text-xs" value={round.date} onChange={e => updateRound(i, "date", e.target.value)} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeRound(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {rounds.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{t("funding.no_rounds")}</p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.goal")}</Label>
                <Input type="number" value={funding.funding_goal || ""} onChange={e => setFunding(p => ({ ...p, funding_goal: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.stage")}</Label>
                <Select value={funding.funding_stage} onValueChange={v => setFunding(p => ({ ...p, funding_stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                    <SelectItem value="seed">Seed</SelectItem>
                    <SelectItem value="series-a">Series A</SelectItem>
                    <SelectItem value="series-b">Series B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.valuation")}</Label>
                <Input type="number" value={funding.valuation || ""} onChange={e => setFunding(p => ({ ...p, valuation: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.timeline")}</Label>
                <Input value={funding.timeline} onChange={e => setFunding(p => ({ ...p, timeline: e.target.value }))} placeholder={t("funding.timeline_placeholder")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.use_product")} (%)</Label>
                <Input type="number" min={0} max={100} value={funding.use_product_pct || ""} onChange={e => setFunding(p => ({ ...p, use_product_pct: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.use_marketing")} (%)</Label>
                <Input type="number" min={0} max={100} value={funding.use_marketing_pct || ""} onChange={e => setFunding(p => ({ ...p, use_marketing_pct: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.use_team")} (%)</Label>
                <Input type="number" min={0} max={100} value={funding.use_team_pct || ""} onChange={e => setFunding(p => ({ ...p, use_team_pct: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground border-0">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t("profile.save")}
            </Button>
          </div>
        ) : (
          <>
            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailItem label={t("funding.stage")} value={funding.funding_stage.toUpperCase()} />
              {funding.valuation > 0 && <DetailItem label={t("funding.valuation")} value={`₼${funding.valuation.toLocaleString()}`} />}
              {funding.timeline && <DetailItem label={t("funding.timeline")} value={funding.timeline} />}
            </div>

            {/* Use of Funds */}
            {(funding.use_product_pct > 0 || funding.use_marketing_pct > 0 || funding.use_team_pct > 0) && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("funding.use_of_funds")}</p>
                <div className="flex gap-2">
                  {funding.use_product_pct > 0 && <FundBar label={t("funding.use_product")} pct={funding.use_product_pct} color="bg-primary" />}
                  {funding.use_marketing_pct > 0 && <FundBar label={t("funding.use_marketing")} pct={funding.use_marketing_pct} color="bg-accent" />}
                  {funding.use_team_pct > 0 && <FundBar label={t("funding.use_team")} pct={funding.use_team_pct} color="bg-muted-foreground" />}
                </div>
              </div>
            )}

            {/* Smart Insight */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{getInsight()}</p>
            </div>
          </>
        )}

        {/* Legal Disclaimer */}
        <p className="text-[10px] text-muted-foreground/60 leading-tight">
          {t("funding.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border p-2.5 bg-muted/30">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
  </div>
);

const FundBar = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <div className="flex-1">
    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
      <span>{label}</span><span>{pct}%</span>
    </div>
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export default FundingOverview;
