import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2, UserRound } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import OriginBackground from "@/components/OriginBackground";
import logoImg from "@/assets/logo.jpeg";

const UserSignUp = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    country: "",
    linkedin_url: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.surname || !form.email || !form.password) {
      toast.error(t("auth.fill_all"));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("auth.password_min"));
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
          country: form.country,
          linkedin_url: form.linkedin_url,
          is_job_seeker: "true",
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.user_signup_success"));
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
          <div className="flex items-center justify-center gap-2 text-primary">
            <UserRound className="h-5 w-5" />
            <span className="text-sm font-semibold">{t("auth.user_reg")}</span>
          </div>
          <CardTitle className="text-2xl font-origin-display font-light">{t("auth.user_signup")}</CardTitle>
          <CardDescription>{t("auth.user_signup_desc")}</CardDescription>
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
              <Input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t("profile.country")}</Label>
              <Input id="country" name="country" placeholder={t("profile.country")} value={form.country} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin_url} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")} *</Label>
              <Input id="password" name="password" type="password" placeholder={t("auth.password_min")} value={form.password} onChange={handleChange} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" variant="white" className="w-full origin-shimmer" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.user_signup")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.have_account")}{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">{t("auth.signin")}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default UserSignUp;
