import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useStartupContext } from "@/context/StartupContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  User, Building2, Mail, CalendarDays, Loader2, Save,
  TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Activity, Globe, Layers
} from "lucide-react";

const COUNTRIES = [
  "Azerbaijan", "Turkey", "United States", "United Kingdom", "Germany", "France",
  "Russia", "Georgia", "Kazakhstan", "Uzbekistan", "Ukraine", "Israel",
  "United Arab Emirates", "Saudi Arabia", "India", "China", "Japan",
  "South Korea", "Canada", "Australia", "Brazil", "Italy", "Spain",
  "Netherlands", "Sweden", "Switzerland", "Singapore", "Estonia", "Poland", "Other"
];

const INDUSTRIES = [
  "Technology", "FinTech", "HealthTech", "EdTech", "E-Commerce", "SaaS",
  "AI / Machine Learning", "Cybersecurity", "IoT", "CleanTech / GreenTech",
  "AgriTech", "FoodTech", "Gaming", "Media & Entertainment", "Real Estate / PropTech",
  "Logistics & Supply Chain", "Travel & Tourism", "Social Media", "Blockchain / Web3",
  "Biotech", "Robotics", "HR Tech", "Legal Tech", "InsurTech", "Other"
];

interface Profile {
  name: string;
  surname: string;
  startup_name: string;
  startup_description: string;
  country: string;
  industry: string;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const { financial, evaluation } = useStartupContext();
  const { isInvestor, isInvestorPending } = useUserRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isInvestorUser = isInvestor || isInvestorPending;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, surname, startup_name, startup_description, country, industry")
        .eq("id", user.id)
        .single();

      if (error) {
        setProfile({
          name: user.user_metadata?.name || "",
          surname: user.user_metadata?.surname || "",
          startup_name: user.user_metadata?.startup_name || "",
          startup_description: user.user_metadata?.startup_description || "",
          country: user.user_metadata?.country || "",
          industry: user.user_metadata?.industry || "",
        });
      } else {
        setProfile({
          name: data.name ?? "",
          surname: data.surname ?? "",
          startup_name: data.startup_name ?? "",
          startup_description: data.startup_description ?? "",
          country: (data as any).country ?? "",
          industry: (data as any).industry ?? "",
        });
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
        country: profile.country,
        industry: profile.industry,
      } as any)
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
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ─── INVESTOR PROFILE ───
  if (isInvestorUser) {
    return (
      <DashboardLayout title="Investor Profile" subtitle="Your personal information">
        <div className="space-y-8">

          <Card className="max-w-lg border-border shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">First Name</Label>
                  <Input id="name" value={profile?.name || ""} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Last Name</Label>
                  <Input id="surname" value={profile?.surname || ""} onChange={e => setProfile(p => p ? { ...p, surname: e.target.value } : p)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={profile?.country || ""} onValueChange={(val) => setProfile(p => p ? { ...p, country: val } : p)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Registration Date</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US") : "—"}
                </div>
              </div>

              {isInvestorPending && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                  ⏳ Your investor application is pending admin approval.
                </div>
              )}
              {isInvestor && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
                  ✅ Approved Investor
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground border-0">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ─── STARTUP PROFILE ───
  return (
    <DashboardLayout title="Profile" subtitle="Your personal and startup information">
      <div className="space-y-8">

        <div className="grid gap-6 lg:grid-cols-3">
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
                <Input id="name" value={profile?.name || ""} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input id="surname" value={profile?.surname || ""} onChange={e => setProfile(p => p ? { ...p, surname: e.target.value } : p)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={profile?.country || ""} onValueChange={(val) => setProfile(p => p ? { ...p, country: val } : p)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input id="startup_name" value={profile?.startup_name || ""} onChange={e => setProfile(p => p ? { ...p, startup_name: e.target.value } : p)} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={profile?.industry || ""} onValueChange={(val) => setProfile(p => p ? { ...p, industry: val } : p)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup_description">About Startup</Label>
                <Textarea id="startup_description" value={profile?.startup_description || ""} onChange={e => setProfile(p => p ? { ...p, startup_description: e.target.value } : p)} rows={4} />
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
                  <p className="text-2xl font-bold text-foreground">${avgValuation.toLocaleString()}</p>
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
              <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Total Revenue" value={`$${(latestSnapshot.revenue?.total ?? 0).toLocaleString()}`} color="text-green-600" bg="bg-green-500/10" />
              <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Total Expenses" value={`$${(latestSnapshot.expenses?.total ?? 0).toLocaleString()}`} color="text-red-500" bg="bg-red-500/10" />
              <StatCard icon={<DollarSign className="h-5 w-5" />} label="Burn Rate" value={`$${Math.abs(latestSnapshot.cashFlow?.monthlyBurnRate ?? 0).toLocaleString()}/mo`} color="text-orange-500" bg="bg-orange-500/10" />
              <StatCard icon={<Users className="h-5 w-5" />} label="Active Users" value={(latestSnapshot.customerMetrics?.activeUsers ?? 0).toLocaleString()} color="text-primary" bg="bg-primary/10" />
              <StatCard icon={<Activity className="h-5 w-5" />} label="ARPU" value={`$${(latestSnapshot.customerMetrics?.arpu ?? 0).toLocaleString()}`} color="text-primary" bg="bg-primary/10" />
              <StatCard icon={<BarChart3 className="h-5 w-5" />} label="CLTV" value={`$${(latestSnapshot.customerMetrics?.cltv ?? 0).toLocaleString()}`} color="text-accent" bg="bg-accent/10" />
              <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Churn Rate" value={`${((latestSnapshot.customerMetrics?.churnRate ?? 0) * 100).toFixed(1)}%`} color="text-red-500" bg="bg-red-500/10" />
              <StatCard icon={<DollarSign className="h-5 w-5" />} label="Runway" value={`${(latestSnapshot.cashFlow?.runway ?? 0).toFixed(1)} months`} color="text-green-600" bg="bg-green-500/10" />
            </div>
          ) : (
            <Card className="border-border shadow-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>No financial data has been entered yet.</p>
                <p className="text-sm mt-1">Add data from the Financial Management section.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
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
