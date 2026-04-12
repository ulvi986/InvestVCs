import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, DollarSign, TrendingUp, Users, Clock, Rocket
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

const INDUSTRY_COLORS: Record<string, string> = {
  fintech: "from-emerald-500 to-teal-600",
  edtech: "from-blue-500 to-indigo-600",
  healthtech: "from-rose-500 to-pink-600",
  medtech: "from-rose-500 to-pink-600",
  agritech: "from-green-500 to-lime-600",
  saas: "from-violet-500 to-purple-600",
  ecommerce: "from-orange-500 to-amber-600",
  ai: "from-cyan-500 to-blue-600",
  default: "from-primary to-accent",
};

const INDUSTRY_ICONS: Record<string, string> = {
  fintech: "💳",
  edtech: "📚",
  healthtech: "🏥",
  medtech: "🏥",
  agritech: "🌾",
  saas: "☁️",
  ecommerce: "🛒",
  ai: "🤖",
  default: "🚀",
};

const getGradient = (industry: string | null) => {
  if (!industry) return INDUSTRY_COLORS.default;
  const key = industry.toLowerCase().replace(/[^a-z]/g, "");
  return INDUSTRY_COLORS[key] || INDUSTRY_COLORS.default;
};

const getIcon = (industry: string | null) => {
  if (!industry) return INDUSTRY_ICONS.default;
  const key = industry.toLowerCase().replace(/[^a-z]/g, "");
  return INDUSTRY_ICONS[key] || INDUSTRY_ICONS.default;
};

const FundingViewPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isInvestor } = useUserRole();
  const [fundingList, setFundingList] = useState<FundingProfile[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    if (!isInvestor) { toast.error("Only investors can show interest"); return; }
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

  const enriched = fundingList
    .filter(f => f.funding_goal > 0)
    .map(f => {
      const profile = profiles.find(p => p.id === f.user_id);
      return { ...f, profile };
    })
    .filter(f => {
      if (!f.profile) return false;
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

  const getDaysLeft = (timeline: string) => {
    if (!timeline) return null;
    const match = timeline.match(/(\d+)/);
    return match ? `${match[1]} ${t("funding.days_left")}` : timeline;
  };

  return (
    <DashboardLayout title={t("crowdfunding.title")} subtitle={t("crowdfunding.subtitle")}>
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("investor.search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : enriched.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{t("crowdfunding.no_startups")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {enriched.map(item => {
              const { profile } = item;
              if (!profile) return null;
              const pct = getPct(item.funding_raised, item.funding_goal);
              const gradient = getGradient(profile.industry);
              const icon = getIcon(profile.industry);
              const isOwn = user?.id === item.user_id;
              const canInteract = isInvestor && !isOwn;

              return (
                <div
                  key={item.user_id}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header with gradient */}
                  <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-5xl">{icon}</span>
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {profile.industry && (
                        <Badge className="bg-background/90 text-foreground text-[10px] font-semibold backdrop-blur-sm border-0">
                          {profile.industry}
                        </Badge>
                      )}
                      {pct >= 70 && (
                        <Badge className="bg-accent text-accent-foreground text-[10px] font-semibold border-0 gap-0.5">
                          <TrendingUp className="h-3 w-3" /> Trend
                        </Badge>
                      )}
                    </div>
                    {item.funding_stage && (
                      <Badge className="absolute top-3 right-3 bg-background/90 text-foreground text-[10px] backdrop-blur-sm border-0">
                        {item.funding_stage.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">
                        {profile.startup_name}
                      </h3>
                      {profile.startup_description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {profile.startup_description}
                        </p>
                      )}
                    </div>

                    {/* Funding amounts */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-primary">
                        ₼{item.funding_raised.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ₼{item.funding_goal.toLocaleString()} {t("crowdfunding.target")}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <Progress value={pct} className="h-2" />

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {item.interest_count} {t("funding.investor_count")}
                      </span>
                      {item.timeline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {getDaysLeft(item.timeline)}
                        </span>
                      )}
                    </div>

                    {/* Action button - only for investors, not own startup */}
                    {canInteract && (
                      <Dialog
                        open={interestOpen === item.user_id}
                        onOpenChange={open => setInterestOpen(open ? item.user_id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                            <Rocket className="h-4 w-4 mr-1.5" />
                            {t("funding.invest_btn")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("funding.show_interest")} — {profile.startup_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>{t("funding.interest_amount")} ({t("funding.optional")})</Label>
                              <Input
                                type="number"
                                value={interestAmount}
                                onChange={e => setInterestAmount(e.target.value)}
                                placeholder="₼0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("funding.interest_role")}</Label>
                              <RadioGroup value={interestRole} onValueChange={setInterestRole}>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="investor" id="cf-inv" />
                                  <Label htmlFor="cf-inv">{t("funding.role_investor")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="mentor" id="cf-men" />
                                  <Label htmlFor="cf-men">{t("funding.role_mentor")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <RadioGroupItem value="partner" id="cf-par" />
                                  <Label htmlFor="cf-par">{t("funding.role_partner")}</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <Button className="w-full" onClick={() => handleInterest(item.user_id)}>
                              {t("funding.submit_interest")}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FundingViewPage;
