import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStartupContext } from "@/context/StartupContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  User, Building2, Mail, CalendarDays, Loader2, Save,
  TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Activity
} from "lucide-react";

interface Profile {
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const { financial, evaluation } = useStartupContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, surname, startup_name, startup_description")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        // Fallback to user metadata
        setProfile({
          name: user.user_metadata?.name || "",
          surname: user.user_metadata?.surname || "",
          startup_name: user.user_metadata?.startup_name || "",
          startup_description: user.user_metadata?.startup_description || "",
        });
      } else {
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        surname: profile.surname,
        startup_name: profile.startup_name,
        startup_description: profile.startup_description,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const latestSnapshot = financial.snapshots.length > 0
    ? financial.snapshots[financial.snapshots.length - 1]
    : null;

  const avgValuation = evaluation.berkus || evaluation.scorecard || evaluation.riskFactor
    ? Math.round(([evaluation.berkus, evaluation.scorecard, evaluation.riskFactor].filter(v => v > 0).reduce((a, b) => a + b, 0)) /
        [evaluation.berkus, evaluation.scorecard, evaluation.riskFactor].filter(v => v > 0).length)
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="mt-2 text-muted-foreground">Your personal and startup information</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info Card */}
          <Card className="lg:col-span-1 border-border shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name</Label>
                <Input
                  id="name"
                  value={profile?.name || ""}
                  onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input
                  id="surname"
                  value={profile?.surname || ""}
                  onChange={e => setProfile(p => p ? { ...p, surname: e.target.value } : p)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Registration Date</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US") : "—"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Startup Info Card */}
          <Card className="lg:col-span-2 border-border shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-accent" />
                Startup Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startup_name">Startup Name</Label>
                <Input
                  id="startup_name"
                  value={profile?.startup_name || ""}
                  onChange={e => setProfile(p => p ? { ...p, startup_name: e.target.value } : p)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup_description">About Startup</Label>
                <Textarea
                  id="startup_description"
                  value={profile?.startup_description || ""}
                  onChange={e => setProfile(p => p ? { ...p, startup_description: e.target.value } : p)}
                  rows={4}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground border-0">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Financial & Valuation Dashboard */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Financial Overview
          </h2>

          {avgValuation > 0 && (
            <Card className="mb-6 border-border shadow-card bg-gradient-to-r from-primary/5 to-accent/5">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Valuation</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${avgValuation.toLocaleString()}
                  </p>
                </div>
                <div className="ml-auto grid grid-cols-3 gap-6 text-center">
                  {evaluation.berkus > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Berkus</p>
                      <p className="font-semibold text-foreground">${evaluation.berkus.toLocaleString()}</p>
                    </div>
                  )}
                  {evaluation.scorecard > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Scorecard</p>
                      <p className="font-semibold text-foreground">${evaluation.scorecard.toLocaleString()}</p>
                    </div>
                  )}
                  {evaluation.riskFactor > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Risk Factor</p>
                      <p className="font-semibold text-foreground">${evaluation.riskFactor.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {latestSnapshot ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Total Revenue"
                value={`$${latestSnapshot.revenue.total.toLocaleString()}`}
                color="text-green-600"
                bg="bg-green-500/10"
              />
              <StatCard
                icon={<TrendingDown className="h-5 w-5" />}
                label="Ümumi Xərclər"
                value={`$${latestSnapshot.expenses.total.toLocaleString()}`}
                color="text-red-500"
                bg="bg-red-500/10"
              />
              <StatCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Burn Rate"
                value={`$${Math.abs(latestSnapshot.cashFlow.monthlyBurnRate).toLocaleString()}/ay`}
                color="text-orange-500"
                bg="bg-orange-500/10"
              />
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Aktiv İstifadəçilər"
                value={latestSnapshot.customerMetrics.activeUsers.toLocaleString()}
                color="text-primary"
                bg="bg-primary/10"
              />
              <StatCard
                icon={<Activity className="h-5 w-5" />}
                label="ARPU"
                value={`$${latestSnapshot.customerMetrics.arpu.toLocaleString()}`}
                color="text-primary"
                bg="bg-primary/10"
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="CLTV"
                value={`$${latestSnapshot.customerMetrics.cltv.toLocaleString()}`}
                color="text-accent"
                bg="bg-accent/10"
              />
              <StatCard
                icon={<TrendingDown className="h-5 w-5" />}
                label="Churn Rate"
                value={`${(latestSnapshot.customerMetrics.churnRate * 100).toFixed(1)}%`}
                color="text-red-500"
                bg="bg-red-500/10"
              />
              <StatCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Runway"
                value={`${latestSnapshot.cashFlow.runway.toFixed(1)} ay`}
                color="text-green-600"
                bg="bg-green-500/10"
              />
            </div>
          ) : (
            <Card className="border-border shadow-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>Hələ maliyyə məlumatı daxil edilməyib.</p>
                <p className="text-sm mt-1">Financial Management bölməsindən data əlavə edin.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: string; color: string; bg: string;
}) => (
  <Card className="border-border shadow-card">
    <CardContent className="flex items-center gap-3 py-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default ProfilePage;
