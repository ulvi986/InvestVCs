import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CheckCircle, XCircle, Users, BarChart3, DollarSign, Cpu, Briefcase, Shield, Clock } from "lucide-react";

interface ProfileRow {
  id: string;
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string | null;
  created_at: string;
}

interface EvalRow {
  user_id: string;
  berkus: number;
  scorecard: number;
  risk_factor: number;
}

interface ReadinessRow {
  user_id: string;
  trl_answers: Record<string, boolean>;
  crl_answers: Record<string, boolean>;
  frl_answers: Record<string, boolean>;
}

interface RoleRow {
  id: string;
  user_id: string;
  role: string;
  approved: boolean;
  created_at: string;
}

interface VacancyRow {
  id: string;
  user_id: string;
  startup_name: string;
  country: string;
  job_type: string;
  startup_description: string | null;
  job_description: string;
  specialization: string;
  created_at: string;
}

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevel(answers: Record<string, boolean>, prefix: string, count: number, criteria: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= count; lvl++) {
    const [mCount, sCount] = criteria[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    const sMet = Array.from({ length: sCount }, (_, i) => answers[`${prefix}-${lvl}-S-${i}`] === true).filter(Boolean).length;
    const sRequired = Math.ceil(sCount * 0.7);
    if (allM && (sCount === 0 || sMet >= sRequired)) finalLevel = lvl;
    else break;
  }
  return finalLevel;
}

const AdminPanel = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;

    const load = async () => {
      const [pRes, eRes, rRes, rolesRes, vRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("evaluations").select("*"),
        supabase.from("readiness_answers").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("startup_vacancies").select("*").order("created_at", { ascending: false }),
      ]);
      setProfiles((pRes.data as any[]) ?? []);
      setEvaluations((eRes.data as any[]) ?? []);
      setReadiness((rRes.data as any[]) ?? []);
      setRoles((rolesRes.data as any[]) ?? []);
      setVacancies((vRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [isAdmin, roleLoading]);

  const approveInvestor = async (roleId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ approved: true })
      .eq("id", roleId);
    if (error) {
      toast.error("Failed to approve");
    } else {
      toast.success("Investor approved!");
      setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, approved: true } : r)));
    }
  };

  const rejectInvestor = async (roleId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", roleId);
    if (error) {
      toast.error("Failed to reject");
    } else {
      toast.success("Investor rejected");
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    }
  };

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-destructive/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have admin privileges.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getProfile = (userId: string) => profiles.find((p) => p.id === userId);
  const getEval = (userId: string) => evaluations.find((e) => e.user_id === userId);
  const getReadiness = (userId: string) => readiness.find((r) => r.user_id === userId);

  const pendingInvestors = roles.filter((r) => r.role === "investor" && !r.approved);
  const approvedInvestors = roles.filter((r) => r.role === "investor" && r.approved);

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" /> Admin Panel
          </h1>
          <p className="mt-2 text-muted-foreground">Manage startups, investors, and vacancies.</p>
        </div>

        <Tabs defaultValue="startups" className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-xl h-auto gap-1 flex-wrap">
            <TabsTrigger value="startups" className="rounded-lg gap-2">
              <Users className="h-4 w-4" /> Startups ({profiles.length})
            </TabsTrigger>
            <TabsTrigger value="investors" className="rounded-lg gap-2">
              <DollarSign className="h-4 w-4" /> Investors ({pendingInvestors.length} pending)
            </TabsTrigger>
            <TabsTrigger value="vacancies" className="rounded-lg gap-2">
              <Briefcase className="h-4 w-4" /> Vacancies ({vacancies.length})
            </TabsTrigger>
          </TabsList>

          {/* Startups Tab */}
          <TabsContent value="startups">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground">No startups yet.</p>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => {
                  const evalData = getEval(profile.id);
                  const readData = getReadiness(profile.id);
                  const trl = readData ? getFinalLevel(readData.trl_answers, "TRL", 9, TRL_CRITERIA) : 0;
                  const crl = readData ? getFinalLevel(readData.crl_answers, "CRL", 9, CRL_CRITERIA) : 0;
                  const frl = readData ? getFinalLevel(readData.frl_answers, "FRL", 9, FRL_CRITERIA) : 0;

                  return (
                    <div key={profile.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{profile.startup_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {profile.name} {profile.surname}
                          </p>
                          {profile.startup_description && (
                            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{profile.startup_description}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Joined {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">Berkus</p>
                          <p className="text-lg font-bold text-primary">${evalData?.berkus?.toLocaleString() ?? "—"}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">Scorecard</p>
                          <p className="text-lg font-bold text-primary">${evalData?.scorecard?.toLocaleString() ?? "—"}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">Risk Factor</p>
                          <p className="text-lg font-bold text-primary">${evalData?.risk_factor?.toLocaleString() ?? "—"}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">TRL</p>
                          <p className="text-lg font-bold text-foreground">{trl}/9</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">CRL</p>
                          <p className="text-lg font-bold text-foreground">{crl}/9</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 bg-muted/30 text-center">
                          <p className="text-xs text-muted-foreground">FRL</p>
                          <p className="text-lg font-bold text-foreground">{frl}/9</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Investors Tab */}
          <TabsContent value="investors">
            {pendingInvestors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" /> Pending Approval
                </h3>
                <div className="space-y-3">
                  {pendingInvestors.map((r) => {
                    const p = getProfile(r.user_id);
                    return (
                      <div key={r.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{p ? `${p.name} ${p.surname}` : r.user_id}</p>
                          <p className="text-sm text-muted-foreground">Applied {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveInvestor(r.id)} className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                            <CheckCircle className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectInvestor(r.id)} className="gap-1">
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold text-foreground mb-4">Approved Investors ({approvedInvestors.length})</h3>
            {approvedInvestors.length === 0 ? (
              <p className="text-muted-foreground">No approved investors yet.</p>
            ) : (
              <div className="space-y-3">
                {approvedInvestors.map((r) => {
                  const p = getProfile(r.user_id);
                  return (
                    <div key={r.id} className="rounded-xl border border-accent/30 bg-accent/5 p-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{p ? `${p.name} ${p.surname}` : r.user_id}</p>
                        <p className="text-sm text-muted-foreground">Approved</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-accent" />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Vacancies Tab */}
          <TabsContent value="vacancies">
            {vacancies.length === 0 ? (
              <p className="text-muted-foreground">No vacancies posted yet.</p>
            ) : (
              <div className="space-y-4">
                {vacancies.map((v) => {
                  const p = getProfile(v.user_id);
                  return (
                    <div key={v.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="text-lg font-bold text-foreground">{v.startup_name}</h4>
                          <p className="text-sm text-muted-foreground">{v.country} · {v.job_type} · {v.specialization}</p>
                          {p && <p className="text-xs text-muted-foreground mt-1">Posted by {p.name} {p.surname}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                      </div>
                      {v.startup_description && <p className="text-sm text-muted-foreground mb-2">{v.startup_description}</p>}
                      <p className="text-sm text-foreground">{v.job_description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminPanel;
