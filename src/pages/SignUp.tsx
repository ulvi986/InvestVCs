import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg shadow-elevated border-border">
        <CardHeader className="text-center space-y-2">
          <Link to="/" className="mx-auto flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <img src={logoImg} alt="InvestVCs" className="h-8 w-8 rounded-lg object-cover" />
            InvestVCs
          </Link>
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Start evaluating your startup</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">First Name *</Label>
                <Input id="name" name="name" placeholder="Your first name" value={form.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surname">Last Name *</Label>
                <Input id="surname" name="surname" placeholder="Your last name" value={form.surname} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" placeholder="At least 6 characters" value={form.password} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={form.country} onValueChange={(val) => setForm(prev => ({ ...prev, country: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startup_name">Startup Name *</Label>
              <Input id="startup_name" name="startup_name" placeholder="Your startup's name" value={form.startup_name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={form.industry} onValueChange={(val) => setForm(prev => ({ ...prev, industry: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
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
              <Textarea id="startup_description" name="startup_description" placeholder="Brief description of your startup" value={form.startup_description} onChange={handleChange} rows={3} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary hover:underline font-medium">Sign In</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Are you an investor?{" "}
              <Link to="/investor-signup" className="text-primary hover:underline font-medium">Investor Registration</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SignUp;