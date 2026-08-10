import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import OriginBackground from "@/components/OriginBackground";
import logoImg from "@/assets/logo.jpeg";

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

const SignUp = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [ethicalAgreed, setEthicalAgreed] = useState(false);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    startup_name: "",
    startup_description: "",
    country: "",
    industry: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.password || !form.startup_name || !form.country || !form.industry) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!ethicalAgreed) {
      toast.error(t("auth.ethical_required"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          surname: form.surname,
          startup_name: form.startup_name,
          startup_description: form.startup_description,
          country: form.country,
          industry: form.industry,
          is_startup: "true",
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Registration successful! Please check your email.");
      navigate("/signin");
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <OriginBackground />
      <Card className="w-full max-w-lg origin-glass">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="mx-auto flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <img src={logoImg} alt="InvestVCs" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">InvestVCs</span>
          </Link>
          <CardTitle className="text-2xl font-origin-display font-light pt-1">{t("auth.signup")}</CardTitle>
          <CardDescription>{t("auth.signup_desc")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.first_name")} *</Label>
                <Input id="name" name="name" placeholder={t("profile.first_name")} value={form.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">{t("profile.last_name")} *</Label>
                <Input id="surname" name="surname" placeholder={t("profile.last_name")} value={form.surname} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")} *</Label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")} *</Label>
              <Input id="password" name="password" type="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile.country")} *</Label>
              <Select value={form.country} onValueChange={(val) => setForm(prev => ({ ...prev, country: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.country")} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startup_name">{t("profile.startup_name")} *</Label>
              <Input id="startup_name" name="startup_name" placeholder={t("profile.startup_name")} value={form.startup_name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile.industry")} *</Label>
              <Select value={form.industry} onValueChange={(val) => setForm(prev => ({ ...prev, industry: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.industry")} />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startup_description">{t("profile.about")}</Label>
              <Textarea id="startup_description" name="startup_description" placeholder={t("profile.about")} value={form.startup_description} onChange={handleChange} rows={3} />
            </div>

            {/* Ethical Agreement */}
            <div className="rounded-lg border border-border bg-white/[0.03] p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("auth.ethical_title")}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("auth.ethical_text")}</p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ethical"
                  checked={ethicalAgreed}
                  onCheckedChange={(checked) => setEthicalAgreed(checked === true)}
                />
                <Label htmlFor="ethical" className="text-sm cursor-pointer">{t("auth.ethical_agreement")}</Label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" variant="white" className="w-full origin-shimmer" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.signup")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.have_account")}{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">{t("auth.signin")}</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("auth.investor_q")}{" "}
              <Link to="/investor-signup" className="text-primary hover:underline font-medium">{t("auth.investor_reg")}</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("auth.jobseeker_q")}{" "}
              <Link to="/user-signup" className="text-primary hover:underline font-medium">{t("auth.user_reg")}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignUp;
