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
  DollarSign, TrendingUp, Save, Loader2, Lightbulb, Heart, Handshake, Bookmark,
  Gauge, Users
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestRole, setInterestRole] = useState("investor");
  const [interestAmount, setInterestAmount] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("startup_funding" as any).select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const d = data as any;
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
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { user_id: user.id, ...funding } as any;
    const { error } = await supabase.from("startup_funding" as any).upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(t("common.loading"));
    else { toast.success(t("profile.save") + " ✓"); setEditing(false); }
  };

  const pct = funding.funding_goal > 0 ? Math.min(100, Math.round((funding.funding_raised / funding.funding_goal) * 100)) : 0;

  const readinessScore = Math.min(100, Math.round(
    (funding.funding_raised > 0 ? 20 : 0) +
    (funding.funding_goal > 0 ? 10 : 0) +
    (funding.last_round_amount > 0 ? 15 : 0) +
    (funding.valuation > 0 ? 20 : 0) +
    ((funding.use_product_pct + funding.use_marketing_pct + funding.use_team_pct) > 0 ? 15 : 0) +
    (funding.funding_stage !== "pre-seed" ? 10 : 5) +
    (funding.timeline ? 10 : 0)
  ));

  const getInsight = (): string => {
    if (funding.funding_raised === 0 && funding.funding_goal > 0) return t("funding.insight_no_funding");
    if (pct >= 80) return t("funding.insight_almost_funded");
    if (pct >= 50) return t("funding.insight_half_funded");
    if (funding.last_round_amount > 0) return t("funding.insight_recent_round");
    return t("funding.insight_early_stage");
  };

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
            <span className="font-bold text-foreground">${funding.funding_raised.toLocaleString()} / ${funding.funding_goal.toLocaleString()}</span>
          </div>
          <Progress value={pct} className="h-4" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{pct}% {t("funding.funded")}</p>
        </div>

        {editing ? (
          <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.raised")}</Label>
                <Input type="number" value={funding.funding_raised || ""} onChange={e => setFunding(p => ({ ...p, funding_raised: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.goal")}</Label>
                <Input type="number" value={funding.funding_goal || ""} onChange={e => setFunding(p => ({ ...p, funding_goal: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.valuation")}</Label>
                <Input type="number" value={funding.valuation || ""} onChange={e => setFunding(p => ({ ...p, valuation: Number(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.last_round_amount")}</Label>
                <Input type="number" value={funding.last_round_amount || ""} onChange={e => setFunding(p => ({ ...p, last_round_amount: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.last_round_date")}</Label>
                <Input type="date" value={funding.last_round_date} onChange={e => setFunding(p => ({ ...p, last_round_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("funding.investor_type")}</Label>
                <Select value={funding.last_round_investor_type} onValueChange={v => setFunding(p => ({ ...p, last_round_investor_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="angel">Angel</SelectItem>
                    <SelectItem value="vc">VC</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="space-y-1">
              <Label className="text-xs">{t("funding.timeline")}</Label>
              <Input value={funding.timeline} onChange={e => setFunding(p => ({ ...p, timeline: e.target.value }))} placeholder={t("funding.timeline_placeholder")} />
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
              {funding.last_round_amount > 0 && <DetailItem label={t("funding.last_round")} value={`$${funding.last_round_amount.toLocaleString()}`} />}
              {funding.last_round_date && <DetailItem label={t("funding.date")} value={new Date(funding.last_round_date).toLocaleDateString()} />}
              {funding.last_round_investor_type && <DetailItem label={t("funding.investor_type")} value={funding.last_round_investor_type} />}
              {funding.valuation > 0 && <DetailItem label={t("funding.valuation")} value={`$${funding.valuation.toLocaleString()}`} />}
              {funding.timeline && <DetailItem label={t("funding.timeline")} value={funding.timeline} />}
            </div>

            {/* Use of Funds */}
            {(funding.use_product_pct > 0 || funding.use_marketing_pct > 0 || funding.use_team_pct > 0) && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t("funding.use_of_funds")}</p>
                <div className="flex gap-2">
                  {funding.use_product_pct > 0 && <FundBar label={t("funding.use_product")} pct={funding.use_product_pct} color="bg-primary" />}
                  {funding.use_marketing_pct > 0 && <FundBar label={t("funding.use_marketing")} pct={funding.use_marketing_pct} color="bg-accent" />}
                  {funding.use_team_pct > 0 && <FundBar label={t("funding.use_team")} pct={funding.use_team_pct} color="bg-purple-500" />}
                </div>
              </div>
            )}

            {/* Smart Insight */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{getInsight()}</p>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {funding.interest_count} {t("funding.interested")}</span>
              {pct >= 70 && <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold text-[10px]">🔥 {t("funding.trending")}</span>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground border-0 gap-1.5">
                    <Heart className="h-3.5 w-3.5" /> {t("funding.show_interest")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("funding.show_interest")}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("funding.interest_amount")} ({t("funding.optional")})</Label>
                      <Input type="number" value={interestAmount} onChange={e => setInterestAmount(e.target.value)} placeholder="$0" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("funding.interest_role")}</Label>
                      <RadioGroup value={interestRole} onValueChange={setInterestRole}>
                        <div className="flex items-center gap-2"><RadioGroupItem value="investor" id="r-inv" /><Label htmlFor="r-inv">{t("funding.role_investor")}</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="mentor" id="r-men" /><Label htmlFor="r-men">{t("funding.role_mentor")}</Label></div>
                        <div className="flex items-center gap-2"><RadioGroupItem value="partner" id="r-par" /><Label htmlFor="r-par">{t("funding.role_partner")}</Label></div>
                      </RadioGroup>
                    </div>
                    <Button className="w-full" onClick={() => { toast.success(t("funding.interest_sent")); setInterestOpen(false); }}>
                      {t("funding.submit_interest")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" className="gap-1.5"><Handshake className="h-3.5 w-3.5" /> {t("funding.request_intro")}</Button>
              <Button variant="ghost" size="sm" className="gap-1.5"><Bookmark className="h-3.5 w-3.5" /> {t("funding.save_btn")}</Button>
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
