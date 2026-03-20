import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Briefcase, Plus, Trash2, X } from "lucide-react";

interface Vacancy {
  id: string;
  user_id: string;
  startup_name: string;
  country: string;
  job_type: string;
  startup_description: string | null;
  job_description: string;
  specialization: string;
  created_at: string;
}

const StartupVacancies = () => {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    startup_name: "",
    country: "",
    job_type: "",
    startup_description: "",
    job_description: "",
    specialization: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("startup_vacancies")
        .select("*")
        .order("created_at", { ascending: false });
      setVacancies((data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.startup_name || !form.country || !form.job_type || !form.job_description || !form.specialization) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("startup_vacancies")
      .insert({
        user_id: user.id,
        startup_name: form.startup_name,
        country: form.country,
        job_type: form.job_type,
        startup_description: form.startup_description || null,
        job_description: form.job_description,
        specialization: form.specialization,
      } as any)
      .select()
      .single();

    setSubmitting(false);
    if (error) {
      toast.error("Failed to post vacancy");
    } else {
      toast.success("Vacancy posted!");
      setVacancies((prev) => [data as any, ...prev]);
      setForm({ startup_name: "", country: "", job_type: "", startup_description: "", job_description: "", specialization: "" });
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("startup_vacancies").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setVacancies((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vacancy deleted");
    }
  };

  return (
    <Layout>
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary" /> Startup Vacancies
            </h1>
            <p className="mt-2 text-muted-foreground">Post and browse startup job opportunities.</p>
          </div>
          {user && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2 gradient-primary text-primary-foreground border-0">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancel" : "Post Vacancy"}
            </Button>
          )}
        </div>

        {/* Post Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startup Name *</Label>
                <Input name="startup_name" placeholder="Your startup name" value={form.startup_name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input name="country" placeholder="e.g. Azerbaijan" value={form.country} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Job Type *</Label>
                <Input name="job_type" placeholder="e.g. Full-time, Remote, Internship" value={form.job_type} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Specialization *</Label>
                <Input name="specialization" placeholder="e.g. Frontend Developer, Marketing" value={form.specialization} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Startup Description</Label>
              <Textarea name="startup_description" placeholder="Brief description of your startup" value={form.startup_description} onChange={handleChange} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea name="job_description" placeholder="Describe the role, responsibilities, and requirements" value={form.job_description} onChange={handleChange} rows={4} />
            </div>
            <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground border-0">
              {submitting ? "Posting..." : "Post Vacancy"}
            </Button>
          </form>
        )}

        {/* Vacancies List */}
        {loading ? (
          <p className="text-muted-foreground">Loading vacancies...</p>
        ) : vacancies.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No vacancies posted yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to post a job opportunity!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vacancies.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-card p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{v.startup_name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">{v.country}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">{v.job_type}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">{v.specialization}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    {user?.id === v.user_id && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {v.startup_description && <p className="text-sm text-muted-foreground mb-3">{v.startup_description}</p>}
                <p className="text-sm text-foreground leading-relaxed">{v.job_description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StartupVacancies;
