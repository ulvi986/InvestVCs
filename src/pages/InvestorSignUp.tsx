import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";

const InvestorSignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
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

    setLoading(true);

    // 1. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          surname: form.surname,
          startup_name: "Investor",
          startup_description: "",
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      setLoading(false);
      toast.error(authError.message);
      return;
    }

    // 2. If user was created, request investor role (pending approval)
    if (authData.user) {
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "investor",
        approved: false,
      } as any);
    }

    setLoading(false);
    toast.success("Registration submitted! An admin will review your request.");
    navigate("/signin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-elevated border-border">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="mx-auto flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            StartupEval
          </Link>
          <div className="flex items-center justify-center gap-2 text-accent">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-semibold">Investor Registration</span>
          </div>
          <CardTitle className="text-2xl font-bold">Investor Sign Up</CardTitle>
          <CardDescription>Apply for investor access. Admin approval required.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name *</Label>
                <Input id="name" name="name" placeholder="Name" value={form.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name *</Label>
                <Input id="surname" name="surname" placeholder="Surname" value={form.surname} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="investor@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply as Investor
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">Sign In</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Are you a startup?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign Up as Startup</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InvestorSignUp;
