import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Loader2, TrendingUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import OriginBackground from "@/components/OriginBackground";
import logoImg from "@/assets/logo.jpeg";

const InvestorSignUp = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [ethicalAgreed, setEthicalAgreed] = useState(false);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    current_company: "",
    linkedin_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.password) {
      toast.error("Please fill in all fields");
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

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          surname: form.surname,
          startup_name: "Investor",
          startup_description: "",
          is_investor: "true",
          current_company: form.current_company,
          linkedin_url: form.linkedin_url,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    if (authError) {
      toast.error(authError.message);
      return;
    }

    toast.success("Registration submitted! An admin will review your request.");
    navigate("/signin");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <OriginBackground />
      <Card className="w-full max-w-md origin-glass">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="mx-auto flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <img src={logoImg} alt="InvestVCs" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">InvestVCs</span>
          </Link>
          <div className="flex items-center justify-center gap-2 text-accent">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-semibold">{t("auth.investor_reg")}</span>
          </div>
          <CardTitle className="text-2xl font-origin-display font-light">{t("auth.investor_signup")}</CardTitle>
          <CardDescription>{t("auth.investor_signup_desc")}</CardDescription>
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
              <Input id="email" name="email" type="email" placeholder="investor@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_company">Company</Label>
              <Input id="current_company" name="current_company" placeholder="e.g. Acme Ventures" value={form.current_company} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin_url} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")} *</Label>
              <Input id="password" name="password" type="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} />
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
              {t("auth.apply_investor")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.have_account")}{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">{t("auth.signin")}</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("auth.startup_q")}{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">{t("auth.signup")}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InvestorSignUp;
