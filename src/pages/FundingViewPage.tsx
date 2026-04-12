import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Search, DollarSign, TrendingUp, Gauge, Heart, Handshake, Bookmark,
  Lightbulb, Users, Globe, Layers, ChevronDown, ChevronUp
} from "lucide-react";

interface FundingProfile {
  user_id: string;
  funding_raised: number;
  funding_goal: number;
  funding_stage: string;
  last_round_amount: number;
  last_round_date: string | null;
  last_round_investor_type: string;
  use_product_pct: number;
  use_marketing_pct: number;
  use_team_pct: number;
  valuation: number;
  timeline: string;
  interest_count: number;
}

interface ProfileRow {
  id: string;
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string | null;
  country: string | null;
  industry: string | null;
}

const FundingViewPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [fundingList, setFundingList] = useState<FundingProfile[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interestOpen, setInterestOpen] = useState<string | null>(null);
  const [interestRole, setInterestRole] = useState("investor");
  const [interestAmount, setInterestAmount] = useState("");

  useEffect(() => {
    const load = async () => {
      const [fRes, pRes] = await Promise.all([
        supabase.from("startup_funding").select("*"),
        supabase.from("profiles").select("*"),
      ]);
      setFundingList((fRes.data as any[]) ?? []);
      setProfiles((pRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleInterest = async (startupUserId: string) => {
    if (!user) { toast.error("Please sign in"); return; }
    const { error } = await supabase.from("funding_interests").insert({
      startup_user_id: startupUserId,
      investor_user_id: user.id,
      role: interestRole,
      amount: interestAmount ? Number(interestAmount) : null,
    } as any);
    if (error) toast.error("Error");
    else {
      toast.success(t("funding.interest_sent"));
      setInterestOpen(null);
      setInterestAmount("");
    }
  };

  const allIndustries = [...new Set(profiles.filter(p => p.industry).map(p => p.industry!))].sort();

  const enriched = fundingList
    .filter(f => f.funding_goal > 0)
    .map(f => {
      const profile = profiles.find(p => p.id === f.user_id);
      return { ...f, profile };
    })
    .filter(f => {
      if (!f.profile) return false;
      if (industryFilter && f.profile.industry !== industryFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        f.profile.startup_name.toLowerCase().includes(s) ||
        f.profile.name.toLowerCase().includes(s) ||
        (f.profile.country ?? "").toLowerCase().includes(s) ||
        (f.profile.industry ?? "").toLowerCase().includes(s)
      );
    });

  const getPct = (raised: number, goal: number) =>
    goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

  const getInsight = (f: FundingProfile): string => {
    const pct = getPct(f.funding_raised, f.funding_goal);
    if (f.funding_raised === 0 && f.funding_goal > 0) return t("funding.insight_no_funding");
    if (pct >= 80) return t("funding.insight_almost_funded");
    if (pct >= 50) return t("funding.insight_half_funded");
    if (f.last_round_amount > 0) return t("funding.insight_recent_round");
    return t("funding.insight_early_stage");
  };

  const getReadinessScore = (f: FundingProfile) => Math.min(100, Math.round(
    (f.funding_raised > 0 ? 20 : 0) + (f.funding_goal > 0 ? 10 : 0) +
    (f.last_round_amount > 0 ? 15 : 0) + (f.valuation > 0 ? 20 : 0) +
    ((f.use_product_pct + f.use_marketing_pct + f.use_team_pct) > 0 ? 15 : 0) +
    (f.funding_stage !== "pre-seed" ? 10 : 5) + (f.timeline ? 10 : 0)
  ));

  return (
    <DashboardLayout title={t("crowdfunding.title")} subtitle={t("crowdfunding.subtitle")}>
      <div className="space-y-6">
        {/* Search and filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("investor.search")} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : enriched.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{t("crowdfunding.no_startups")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enriched.map(item => {
              const { profile } = item;
              if (!profile) return null;
              const pct = getPct(item.funding_raised, item.funding_goal);
              const readiness = getReadinessScore(item);
              const isExpanded = expandedId === item.user_id;

              return (
                <Card key={item.user_id} className="border-border shadow-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.user_id)}
                    className="w-full p-6 text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-foreground">{profile.startup_name}</h3>
                          <Badge variant="outline" className="text-[10px]">{item.funding_stage.toUpperCase()}</Badge>
                          {pct >= 70 && <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">🔥 {t("funding.trending")}</Badge>}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.name} {profile.surname}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile.country && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {profile.country}
                            </span>
                          )}
                          {profile.industry && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1">
                              <Layers className="h-3 w-3" /> {profile.industry}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">${item.funding_raised.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{t("crowdfunding.of")} ${item.funding_goal.toLocaleString()}</p>
                        <div className="flex items-center gap-1.5 mt-1 justify-end">
                          <Gauge className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary">{readiness}/100</span>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4">
                      <Progress value={pct} className="h-3" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{pct}% {t("funding.funded")}</p>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-6 space-y-5">
                      {profile.startup_description && (
                        <p className="text-sm text-muted-foreground">{profile.startup_description}</p>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <DetailItem label={t("funding.stage")} value={item.funding_stage.toUpperCase()} />
                        {item.last_round_amount > 0 && <DetailItem label={t("funding.last_round")} value={`$${item.last_round_amount.toLocaleString()}`} />}
                        {item.last_round_date && <DetailItem label={t("funding.date")} value={new Date(item.last_round_date).toLocaleDateString()} />}
                        {item.last_round_investor_type && <DetailItem label={t("funding.investor_type")} value={item.last_round_investor_type} />}
                        {item.valuation > 0 && <DetailItem label={t("funding.valuation")} value={`$${item.valuation.toLocaleString()}`} />}
                        {item.timeline && <DetailItem label={t("funding.timeline")} value={item.timeline} />}
                      </div>

                      {/* Use of Funds */}
                      {(item.use_product_pct > 0 || item.use_marketing_pct > 0 || item.use_team_pct > 0) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">{t("funding.use_of_funds")}</p>
                          <div className="flex gap-2">
                            {item.use_product_pct > 0 && <FundBar label={t("funding.use_product")} pct={item.use_product_pct} color="bg-primary" />}
                            {item.use_marketing_pct > 0 && <FundBar label={t("funding.use_marketing")} pct={item.use_marketing_pct} color="bg-accent" />}
                            {item.use_team_pct > 0 && <FundBar label={t("funding.use_team")} pct={item.use_team_pct} color="bg-purple-500" />}
                          </div>
                        </div>
                      )}

                      {/* Smart Insight */}
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{getInsight(item)}</p>
                      </div>

                      {/* Social Proof */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {item.interest_count} {t("funding.interested")}</span>
                      </div>

                      {/* Actions */}
                      {user && user.id !== item.user_id && (
                        <div className="flex gap-2">
                          <Dialog open={interestOpen === item.user_id} onOpenChange={open => setInterestOpen(open ? item.user_id : null)}>
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
                                    <div className="flex items-center gap-2"><RadioGroupItem value="investor" id="cf-inv" /><Label htmlFor="cf-inv">{t("funding.role_investor")}</Label></div>
                                    <div className="flex items-center gap-2"><RadioGroupItem value="mentor" id="cf-men" /><Label htmlFor="cf-men">{t("funding.role_mentor")}</Label></div>
                                    <div className="flex items-center gap-2"><RadioGroupItem value="partner" id="cf-par" /><Label htmlFor="cf-par">{t("funding.role_partner")}</Label></div>
                                  </RadioGroup>
                                </div>
                                <Button className="w-full" onClick={() => handleInterest(item.user_id)}>
                                  {t("funding.submit_interest")}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" className="gap-1.5"><Handshake className="h-3.5 w-3.5" /> {t("funding.request_intro")}</Button>
                          <Button variant="ghost" size="sm" className="gap-1.5"><Bookmark className="h-3.5 w-3.5" /> {t("funding.save_btn")}</Button>
                        </div>
                      )}

                      {/* Disclaimer */}
                      <p className="text-[10px] text-muted-foreground/60 leading-tight">{t("funding.disclaimer")}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
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

export default FundingViewPage;
