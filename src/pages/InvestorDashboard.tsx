import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Shield, TrendingUp, Search, Globe, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProfileRow {
  id: string;
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string | null;
  country: string | null;
  industry: string | null;
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

const TRL_CRITERIA = [[1,2],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const CRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];
const FRL_CRITERIA = [[1,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1],[2,1]];

function getFinalLevel(answers: Record<string, boolean>, prefix: string, count: number, criteria: number[][]): number {
  let finalLevel = 0;
  for (let lvl = 1; lvl <= count; lvl++) {
    const [mCount] = criteria[lvl - 1] || [2, 1];
    const allM = Array.from({ length: mCount }, (_, i) => answers[`${prefix}-${lvl}-M-${i}`] === true).every(Boolean);
    if (allM) finalLevel = lvl;
    else break;
  }
  return finalLevel;
}

const InvestorDashboard = () => {
  const { isInvestor, isInvestorPending, loading: roleLoading } = useUserRole();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (roleLoading || !isInvestor) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const [pRes, eRes, rRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("evaluations").select("*"),
        supabase.from("readiness_answers").select("*"),
      ]);
      setProfiles((pRes.data as any[]) ?? []);
      setEvaluations((eRes.data as any[]) ?? []);
      setReadiness((rRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [isInvestor, roleLoading]);

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (isInvestorPending) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center max-w-md">
            <Shield className="h-16 w-16 text-amber-500/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Pending Approval</h2>
            <p className="text-muted-foreground">Your investor application is under review. An admin will approve your access shortly.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isInvestor) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 text-destructive/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have investor privileges.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filtered = profiles.filter((p) =>
    !search ||
    p.startup_name.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.surname.toLowerCase().includes(search.toLowerCase()) ||
    (p.country ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.industry ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="container py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" /> Investor Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">Browse all startups and their evaluation data.</p>
        </div>

        <div className="mb-6 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search startups, country, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No startups found.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((profile) => {
              const evalData = evaluations.find((e) => e.user_id === profile.id);
              const readData = readiness.find((r) => r.user_id === profile.id);
              const trl = readData ? getFinalLevel(readData.trl_answers, "TRL", 9, TRL_CRITERIA) : 0;
              const crl = readData ? getFinalLevel(readData.crl_answers, "CRL", 9, CRL_CRITERIA) : 0;
              const frl = readData ? getFinalLevel(readData.frl_answers, "FRL", 9, FRL_CRITERIA) : 0;

              return (
                <div key={profile.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{profile.startup_name}</h3>
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
                      {profile.startup_description && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-xl">{profile.startup_description}</p>
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
      </div>
    </Layout>
  );
};

export default InvestorDashboard;
