import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { BarChart3, Loader2 } from "lucide-react";

const SignIn = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Zəhmət olmasa bütün sahələri doldurun");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Uğurla daxil oldunuz!");
      navigate("/");
    }
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
          <CardTitle className="text-2xl font-bold">Daxil olun</CardTitle>
          <CardDescription>Hesabınıza daxil olun</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-poçt</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifrə</Label>
              <Input id="password" type="password" placeholder="Şifrəniz" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daxil ol
            </Button>
            <p className="text-sm text-muted-foreground">
              Hesabınız yoxdur?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Qeydiyyatdan keçin</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignIn;
