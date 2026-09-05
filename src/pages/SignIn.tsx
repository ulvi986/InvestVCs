import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import logoImg from "@/assets/logo.jpeg";

const SignIn = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t("vacancies.fill_required"));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.signin") + " ✓");
      navigate("/");
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md origin-glass">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="mx-auto flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <img src={logoImg} alt="InvestVCs" className="h-9 w-9 rounded-xl object-cover" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">InvestVCs</span>
          </Link>
          <CardTitle className="text-2xl font-origin-display font-light pt-1">{t("auth.signin")}</CardTitle>
          <CardDescription>{t("auth.signin_desc")}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" variant="white" className="w-full origin-shimmer" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.signin")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("auth.no_account")}{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">{t("auth.signup")}</Link>
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

export default SignIn;
