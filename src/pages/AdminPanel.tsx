import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/context/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CheckCircle, XCircle, Users, DollarSign, Briefcase, Shield, Clock, Trash2, Mail, TrendingUp, TrendingDown, Wallet, Target, AlertTriangle, KeyRound, Plus, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProfileRow { id: string; name: string; surname: string; email: string; startup_name: string; startup_description: string | null; country: string; industry: string; created_at: string; }
interface FinancialSnapshotRow { user_id: string; date: string; data: any; }
interface EvalRow { user_id: string; berkus: number; scorecard: number; risk_factor: number; }
interface ReadinessRow { user_id: string; trl_answers: Record<string, boolean>; crl_answers: Record<string, boolean>; frl_answers: Record<string, boolean>; }
interface RoleRow { id: string; user_id: string; role: string; approved: boolean; created_at: string; }
interface VacancyRow { id: string; user_id: string; startup_name: string; country: string; job_type: string; startup_description: string | null; job_description: string; specialization: string; contact_email: string; approved: boolean; created_at: string; }
interface VoucherRow { id: string; code: string; type: string; max_uses: number; used_count: number; created_by: string; created_at: string; }

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevel(answers: Record<string, boolean>, prefix: string, count: number, criteria: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= count; lvl++) {
    const [mCount] = criteria[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    if (allM) finalLevel = lvl; else break;
  }
  return finalLevel;
}

const AdminPanel = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [financials, setFinancials] = useState<FinancialSnapshotRow[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [newVoucherCode, setNewVoucherCode] = useState("");
  const [newVoucherType, setNewVoucherType] = useState("both");
  const [newVoucherMaxUses, setNewVoucherMaxUses] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    const load = async () => {
      const [pRes, eRes, rRes, rolesRes, vRes, fRes, vouRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("evaluations").select("*"),
        supabase.from("readiness_answers").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("startup_vacancies").select("*").order("created_at", { ascending: false }),
        supabase.from("financial_snapshots").select("*"),
        supabase.from("vouchers").select("*").order("created_at", { ascending: false }),
      ]);
      setProfiles((pRes.data as any[]) ?? []);
      setEvaluations((eRes.data as any[]) ?? []);
      setReadiness((rRes.data as any[]) ?? []);
      setRoles((rolesRes.data as any[]) ?? []);
      setVacancies((vRes.data as any[]) ?? []);
      setFinancials((fRes.data as any[]) ?? []);
      setVouchers((vouRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [isAdmin, roleLoading]);

  const numFmt = (v: number | null | undefined) => {
    if (v === null || v === undefined || !isFinite(v) || isNaN(v)) return "—";
    return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const approveInvestor = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").update({ approved: true }).eq("id", roleId);
    if (error) toast.error("Failed"); else { toast.success(t("admin.approve") + " ✓"); setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, approved: true } : r))); }
  };
  const rejectInvestor = async (roleId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast.error("Failed"); else { toast.success(t("admin.reject") + " ✓"); setRoles((prev) => prev.filter((r) => r.id !== roleId)); }
  };
  const deleteStartup = async (profileId: string) => {
    if (!confirm(t("admin.confirm_delete"))) return;
    await Promise.all([
      supabase.from("evaluations").delete().eq("user_id", profileId),
      supabase.from("readiness_answers").delete().eq("user_id", profileId),
      supabase.from("financial_snapshots").delete().eq("user_id", profileId),
      supabase.from("startup_vacancies").delete().eq("user_id", profileId),
    ]);
    const { error } = await supabase.from("profiles").delete().eq("id", profileId);
    if (error) toast.error("Failed"); else {
      toast.success(t("admin.delete") + " ✓");
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
      setEvaluations((prev) => prev.filter((e) => e.user_id !== profileId));
      setReadiness((prev) => prev.filter((r) => r.user_id !== profileId));
      setVacancies((prev) => prev.filter((v) => v.user_id !== profileId));
    }
  };
  const createVoucher = async () => {
    if (!newVoucherCode.trim()) { toast.error("Enter a voucher code"); return; }
    const { data, error } = await supabase.from("vouchers").insert({ code: newVoucherCode.trim(), type: newVoucherType, max_uses: newVoucherMaxUses, created_by: profiles[0]?.id || "" } as any).select().single();
    if (error) toast.error(error.message); else { toast.success("Voucher created"); setVouchers(prev => [data as any, ...prev]); setNewVoucherCode(""); }
  };
  const deleteVoucher = async (id: string) => {
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) toast.error("Failed"); else { toast.success("Deleted"); setVouchers(prev => prev.filter(v => v.id !== id)); }
  };

  const approveVacancy = async (id: string) => {
    const { error } = await supabase.from("startup_vacancies").update({ approved: true } as any).eq("id", id);
    if (error) toast.error("Failed"); else { toast.success(t("admin.approve") + " ✓"); setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, approved: true } : v))); }
  };
  const deleteVacancy = async (id: string) => {
    const { error } = await supabase.from("startup_vacancies").delete().eq("id", id);
    if (error) toast.error("Failed"); else { toast.success(t("admin.delete") + " ✓"); setVacancies((prev) => prev.filter((v) => v.id !== id)); }
  };

  if (roleLoading) return (<DashboardLayout><div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{t("common.loading")}</div></DashboardLayout>);
  if (!isAdmin) return (<DashboardLayout><div className="flex min-h-[60vh] items-center justify-center"><div className="text-center"><Shield className="h-16 w-16 text-destructive/50 mx-auto mb-4" /><h2 className="text-2xl font-bold text-foreground mb-2">{t("admin.access_denied")}</h2><p className="text-muted-foreground">{t("admin.no_admin")}</p></div></div></DashboardLayout>);

  const getProfile = (userId: string) => profiles.find((p) => p.id === userId);
  const getEval = (userId: string) => evaluations.find((e) => e.user_id === userId);
  const getReadiness = (userId: string) => readiness.find((r) => r.user_id === userId);
  const getLatestFinancial = (userId: string) => {
    const userF = financials.filter((f) => f.user_id === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return userF[0]?.data;
  };

  const pendingInvestors = roles.filter((r) => r.role === "investor" && !r.approved);
  const approvedInvestors = roles.filter((r) => r.role === "investor" && r.approved);
  const pendingVacancies = vacancies.filter((v) => !v.approved);
  const approvedVacancies = vacancies.filter((v) => v.approved);

  return (
    <DashboardLayout title={t("admin.title")} subtitle={t("admin.subtitle")}>
      <div className="space-y-6">
        <Tabs defaultValue="startups" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1 flex-wrap">
            <TabsTrigger value="startups" className="rounded-lg gap-2"><Users className="h-4 w-4" /> {t("admin.startups")} ({profiles.length})</TabsTrigger>
            <TabsTrigger value="investors" className="rounded-lg gap-2"><DollarSign className="h-4 w-4" /> {t("admin.investors")} ({pendingInvestors.length} {t("admin.pending")})</TabsTrigger>
            <TabsTrigger value="vacancies" className="rounded-lg gap-2"><Briefcase className="h-4 w-4" /> {t("admin.vacancies")} ({pendingVacancies.length} {t("admin.pending")})</TabsTrigger>
            <TabsTrigger value="vouchers" className="rounded-lg gap-2"><KeyRound className="h-4 w-4" /> Vouchers ({vouchers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="startups">
            {loading ? (<p className="text-muted-foreground">{t("common.loading")}</p>) : profiles.length === 0 ? (<p className="text-muted-foreground">{t("admin.no_startups")}</p>) : (
              <div className="space-y-4">
                {profiles.map((profile) => {
                  const evalData = getEval(profile.id);
                  const readData = getReadiness(profile.id);
                  const trl = readData ? getFinalLevel(readData.trl_answers, "TRL", 9, TRL_CRITERIA) : 0;
                  const crl = readData ? getFinalLevel(readData.crl_answers, "CRL", 9, CRL_CRITERIA) : 0;
                  const frl = readData ? getFinalLevel(readData.frl_answers, "FRL", 9, FRL_CRITERIA) : 0;
                  const latestF = getLatestFinancial(profile.id);
                  return (
                    <div key={profile.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{profile.startup_name}</h3>
                          <p className="text-sm text-muted-foreground">{profile.name} {profile.surname}</p>
                          {(profile as any).email && (<p className="text-xs text-primary mt-0.5 flex items-center gap-1"><Mail className="h-3 w-3" /> {(profile as any).email}</p>)}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(profile as any).country && (<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{(profile as any).country}</span>)}
                            {(profile as any).industry && (<span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{(profile as any).industry}</span>)}
                          </div>
                          {profile.startup_description && (<p className="text-sm text-muted-foreground mt-1 max-w-xl">{profile.startup_description}</p>)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t("admin.joined")} {new Date(profile.created_at).toLocaleDateString()}</span>
                          <Button variant="ghost" size="icon" onClick={() => deleteStartup(profile.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">Berkus</p><p className="text-lg font-bold text-primary">{numFmt(evalData?.berkus)}</p></div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">Scorecard</p><p className="text-lg font-bold text-primary">{numFmt(evalData?.scorecard)}</p></div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">Risk Factor</p><p className="text-lg font-bold text-primary">{numFmt(evalData?.risk_factor)}</p></div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">TRL</p><p className="text-lg font-bold text-foreground">{trl}/9</p></div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">CRL</p><p className="text-lg font-bold text-foreground">{crl}/9</p></div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><p className="text-xs text-muted-foreground">FRL</p><p className="text-lg font-bold text-foreground">{frl}/9</p></div>
                      </div>
                      {latestF && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> {t("admin.financial_report")}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="h-3 w-3 text-accent" /><p className="text-xs text-muted-foreground">{t("investor.revenue")}</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.revenue?.total)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><TrendingDown className="h-3 w-3 text-destructive" /><p className="text-xs text-muted-foreground">{t("investor.expenses")}</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.expenses?.total)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><Wallet className="h-3 w-3 text-primary" /><p className="text-xs text-muted-foreground">{t("summary.ending_cash")}</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.cashFlow?.endingCash)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><Users className="h-3 w-3 text-accent" /><p className="text-xs text-muted-foreground">{t("summary.active_users")}</p></div><p className="text-lg font-bold text-foreground">{latestF.customerMetrics?.activeUsers ?? "—"}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><DollarSign className="h-3 w-3 text-accent" /><p className="text-xs text-muted-foreground">ARPU</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.customerMetrics?.arpu)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><AlertTriangle className="h-3 w-3 text-destructive" /><p className="text-xs text-muted-foreground">{t("investor.burn_rate")}</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.cashFlow?.monthlyBurnRate)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><Target className="h-3 w-3 text-primary" /><p className="text-xs text-muted-foreground">CLTV</p></div><p className="text-lg font-bold text-foreground">{numFmt(latestF.customerMetrics?.cltv)}</p></div>
                            <div className="rounded-lg border border-border p-3 bg-muted/30 text-center"><div className="flex items-center justify-center gap-1 mb-1"><Wallet className="h-3 w-3 text-accent" /><p className="text-xs text-muted-foreground">{t("investor.runway")}</p></div><p className="text-lg font-bold text-foreground">{latestF.cashFlow?.runway != null ? `${Math.round(latestF.cashFlow.runway)} ${t("investor.months")}` : "—"}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="investors">
            {pendingInvestors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /> {t("admin.pending_approval")} ({pendingInvestors.length})</h3>
                <div className="space-y-3">
                  {pendingInvestors.map((r) => {
                    const p = getProfile(r.user_id);
                    return (
                      <div key={r.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
                        <div><p className="font-semibold text-foreground">{p ? `${p.name} ${p.surname}` : r.user_id}</p><p className="text-sm text-muted-foreground">{t("admin.applied")} {new Date(r.created_at).toLocaleDateString()}</p></div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveInvestor(r.id)} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle className="h-4 w-4" /> {t("admin.approve")}</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectInvestor(r.id)} className="gap-1"><XCircle className="h-4 w-4" /> {t("admin.reject")}</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-4">{t("admin.approved_investors")} ({approvedInvestors.length})</h3>
            {approvedInvestors.length === 0 ? (<p className="text-muted-foreground">{t("admin.no_investors")}</p>) : (
              <div className="space-y-3">
                {approvedInvestors.map((r) => {
                  const p = getProfile(r.user_id);
                  return (
                    <div key={r.id} className="rounded-xl border border-accent/30 bg-accent/5 p-5 flex items-center justify-between">
                      <div><p className="font-semibold text-foreground">{p ? `${p.name} ${p.surname}` : r.user_id}</p><p className="text-sm text-muted-foreground">{t("profile.approved")}</p></div>
                      <CheckCircle className="h-5 w-5 text-accent" />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vacancies">
            {pendingVacancies.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-amber-500" /> {t("admin.pending_approval")} ({pendingVacancies.length})</h3>
                <div className="space-y-4">
                  {pendingVacancies.map((v) => {
                    const p = getProfile(v.user_id);
                    return (
                      <div key={v.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                          <div>
                            <h4 className="text-lg font-bold text-foreground">{v.startup_name}</h4>
                            <p className="text-sm text-muted-foreground">{v.country} · {v.job_type} · {v.specialization}</p>
                            {p && <p className="text-xs text-muted-foreground mt-1">{t("admin.posted_by")} {p.name} {p.surname}</p>}
                            {v.contact_email && (<p className="text-xs text-primary mt-1 flex items-center gap-1"><Mail className="h-3 w-3" /> {v.contact_email}</p>)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                            <Button size="sm" onClick={() => approveVacancy(v.id)} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"><CheckCircle className="h-4 w-4" /> {t("admin.approve")}</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteVacancy(v.id)} className="gap-1"><Trash2 className="h-4 w-4" /> {t("admin.delete")}</Button>
                          </div>
                        </div>
                        {v.startup_description && <p className="text-sm text-muted-foreground mb-2">{v.startup_description}</p>}
                        <p className="text-sm text-foreground">{v.job_description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-4">{t("admin.approved_vacancies")} ({approvedVacancies.length})</h3>
            {approvedVacancies.length === 0 ? (<p className="text-muted-foreground">{t("admin.no_vacancies")}</p>) : (
              <div className="space-y-4">
                {approvedVacancies.map((v) => {
                  const p = getProfile(v.user_id);
                  return (
                    <div key={v.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="text-lg font-bold text-foreground">{v.startup_name}</h4>
                          <p className="text-sm text-muted-foreground">{v.country} · {v.job_type} · {v.specialization}</p>
                          {p && <p className="text-xs text-muted-foreground mt-1">{t("admin.posted_by")} {p.name} {p.surname}</p>}
                          {v.contact_email && (<p className="text-xs text-primary mt-1 flex items-center gap-1"><Mail className="h-3 w-3" /> {v.contact_email}</p>)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                          <Button size="sm" variant="destructive" onClick={() => deleteVacancy(v.id)} className="gap-1"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {v.startup_description && <p className="text-sm text-muted-foreground mb-2">{v.startup_description}</p>}
                      <p className="text-sm text-foreground">{v.job_description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vouchers">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Create Voucher</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Code</label>
                  <Input placeholder="VOUCHER-CODE" value={newVoucherCode} onChange={e => setNewVoucherCode(e.target.value)} className="w-48" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Type</label>
                  <select value={newVoucherType} onChange={e => setNewVoucherType(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="both">Both</option>
                    <option value="bmc">BMC Only</option>
                    <option value="pitch_deck">Pitch Deck Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Max Uses</label>
                  <Input type="number" min={1} value={newVoucherMaxUses} onChange={e => setNewVoucherMaxUses(Number(e.target.value) || 1)} className="w-24" />
                </div>
                <Button onClick={createVoucher} className="gradient-primary text-primary-foreground border-0 gap-1"><Plus className="h-4 w-4" /> Create</Button>
              </div>
            </div>
            {vouchers.length === 0 ? <p className="text-muted-foreground">No vouchers yet.</p> : (
              <div className="space-y-3">
                {vouchers.map(v => (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <code className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{v.code}</code>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{v.type}</span>
                      <span className="text-sm text-muted-foreground">{v.used_count}/{v.max_uses} used</span>
                      <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => deleteVoucher(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPanel;
