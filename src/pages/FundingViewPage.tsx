import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, DollarSign, TrendingUp, Users, Send, UserPlus
} from "lucide-react";

interface FundingProfile {
  user_id: string;
  funding_raised: number;
  funding_goal: number;
  funding_stage: string;
  valuation: number;
  timeline: string;
  interest_count: number;
}

interface FundingRound {
  id: string;
  user_id: string;
  round_name: string;
  amount: number;
  investor_name: string | null;
  date: string | null;
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
  fintech: "💳", edtech: "📚", healthtech: "🏥", medtech: "🏥",
  agritech: "🌾", saas: "☁️", ecommerce: "🛒", ai: "🤖", default: "🚀",
};

const ROUND_COLORS = [
  "bg-primary", "bg-accent", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500"
];

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
  const [allRounds, setAllRounds] = useState<FundingRound[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [interestOpen, setInterestOpen] = useState<string | null>(null);
  const [interestRole, setInterestRole] = useState("investor");
  const [interestMessage, setInterestMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const [fRes, pRes, rRes] = await Promise.all([
        supabase.from("startup_funding").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("funding_rounds" as any).select("*"),
      ]);
      setFundingList((fRes.data as any[]) ?? []);
      setProfiles((pRes.data as any[]) ?? []);
      setAllRounds((rRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleRequestInfo = async (startupUserId: string, startupName: string) => {
    if (!user) { toast.error("Please sign in"); return; }
    if (!isInvestor) { toast.error("Only investors can show interest"); return; }
    if (!interestMessage) {
      toast.error(t("funding.message_required") || "Please write a message");
      return;
    }

    try {
      // 1. Insert interest record
      // 1. Upsert interest record (allows re-sending with updated message)
      const { error } = await supabase.from("funding_interests").upsert({
        startup_user_id: startupUserId,
        investor_user_id: user.id,
        role: interestRole,
        amount: null,
        message: interestMessage || null,
      } as any, { onConflict: "startup_user_id,investor_user_id" } as any);
      if (error) throw error;

      // 2. Increment interest_count on startup_funding
      const existing = fundingList.find(f => f.user_id === startupUserId);
      if (existing) {
        await supabase.from("startup_funding").update({
          interest_count: (existing.interest_count ?? 0) + 1,
        }).eq("user_id", startupUserId);
      } else {
        await supabase.from("startup_funding").insert({
          user_id: startupUserId,
          interest_count: 1,
        } as any);
      }

      // 3. Send email notification via Brevo
      const investorProfile = profiles.find(p => p.id === user.id);
      const investorName = investorProfile
        ? `${investorProfile.name} ${investorProfile.surname}`
        : user.email || "An investor";

      await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: "u.sharifzade2007@gmail.com",
          subject: `New Investor Interest: ${startupName}`,
          message: `Investor: ${investorName}\nRole: ${interestRole}\n\nMessage:\n${interestMessage}\n\nStartup: ${startupName}\nTotal investors interested: ${(existing?.interest_count ?? 0) + 1}`,
          senderName: investorName,
          senderEmail: user.email,
        },
      });

      // Update local state
      setFundingList(prev => prev.map(f =>
        f.user_id === startupUserId
          ? { ...f, interest_count: (f.interest_count ?? 0) + 1 }
          : f
      ));

      toast.success(t("funding.interest_sent"));
      setInterestOpen(null);
      setInterestMessage("");
      setInterestRole("investor");
    } catch (err) {
      console.error("Request info error:", err);
      toast.error("Error sending request");
    }
  };

  // Build from profiles so startups without funding data still appear
  const enriched = profiles
    .map(profile => {
      const fundingData = fundingList.find(f => f.user_id === profile.id);
      const rounds = allRounds.filter(r => r.user_id === profile.id);
      return {
        user_id: profile.id,
        funding_raised: fundingData?.funding_raised ?? 0,
        funding_goal: fundingData?.funding_goal ?? 0,
        funding_stage: fundingData?.funding_stage ?? "pre-seed",
        valuation: fundingData?.valuation ?? 0,
        timeline: fundingData?.timeline ?? "",
        interest_count: fundingData?.interest_count ?? 0,
        profile,
        rounds,
      };
    })
    .filter(f => {
      // Exclude current user's own profile
      if (user && f.user_id === user.id) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        f.profile.startup_name.toLowerCase().includes(s) ||
        f.profile.name.toLowerCase().includes(s) ||
        (f.profile.country ?? "").toLowerCase().includes(s) ||
        (f.profile.industry ?? "").toLowerCase().includes(s)
      );
    });

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enriched.map(item => {
              const { profile, rounds } = item;
              const gradient = getGradient(profile.industry);
              const icon = getIcon(profile.industry);
              const totalRaised = rounds.reduce((s, r) => s + (Number(r.amount) || 0), 0);
              const maxRound = Math.max(...rounds.map(r => Number(r.amount) || 0), 1);

              return (
                <div
                  key={item.user_id}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className={`relative h-28 bg-gradient-to-br ${gradient} flex items-center gap-4 px-5`}>
                    <div className="h-16 w-16 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-lg leading-tight truncate drop-shadow-sm">
                        {profile.startup_name}
                      </h3>
                      <p className="text-white/80 text-sm truncate">{profile.name} {profile.surname}</p>
                      <div className="flex gap-1.5 mt-1">
                        {profile.industry && (
                          <Badge className="bg-white/20 text-white text-[10px] font-semibold backdrop-blur-sm border-0">
                            {profile.industry}
                          </Badge>
                        )}
                        {profile.country && (
                          <Badge className="bg-white/20 text-white text-[10px] backdrop-blur-sm border-0">
                            {profile.country}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.funding_stage && (
                      <Badge className="absolute top-3 right-3 bg-background/90 text-foreground text-[10px] backdrop-blur-sm border-0">
                        {item.funding_stage.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    {profile.startup_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {profile.startup_description}
                      </p>
                    )}

                    {/* Funding Summary */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("funding.raised")}</p>
                        <p className="text-xl font-bold text-primary">₼{totalRaised.toLocaleString()}</p>
                      </div>
                      {item.funding_goal > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{t("funding.goal")}</p>
                          <p className="text-lg font-bold text-foreground">₼{item.funding_goal.toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Rounds Bar Chart */}
                    {rounds.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("funding.rounds_title")}
                        </p>
                        {rounds.map((round, i) => (
                          <div key={round.id} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 shrink-0 truncate">{round.round_name}</span>
                            <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full rounded ${ROUND_COLORS[i % ROUND_COLORS.length]} transition-all`}
                                style={{ width: `${Math.max(4, (Number(round.amount) / maxRound) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-foreground w-20 text-right">₼{Number(round.amount).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">{t("funding.no_rounds")}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {item.valuation > 0 && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          ₼{item.valuation.toLocaleString()} val.
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {item.interest_count} {t("funding.investor_count")}
                      </span>
                    </div>

                    {/* Action Button */}
                    {isInvestor && user?.id !== item.user_id && (
                      <Dialog
                        open={interestOpen === item.user_id}
                        onOpenChange={open => setInterestOpen(open ? item.user_id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            {t("funding.request_intro")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("funding.show_interest")} — {profile.startup_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-xs text-muted-foreground">{t("funding.interest_admin_note")}</p>
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
                            <div className="space-y-2">
                              <Label>{t("funding.interest_message")} *</Label>
                              <Textarea
                                value={interestMessage}
                                onChange={e => setInterestMessage(e.target.value)}
                                placeholder={t("funding.interest_message_placeholder")}
                                rows={3}
                              />
                            </div>
                            <Button className="w-full gap-2" onClick={() => handleRequestInfo(item.user_id, profile.startup_name)}>
                              <Send className="h-4 w-4" />
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
