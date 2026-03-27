import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Briefcase, Plus, Trash2, X, Pencil, Mail, Clock, CheckCircle } from "lucide-react";

interface Vacancy {
  id: string;
  user_id: string;
  startup_name: string;
  country: string;
  job_type: string;
  startup_description: string | null;
  job_description: string;
  specialization: string;
  contact_email: string;
  approved: boolean;
  created_at: string;
}

const emptyForm = {
  startup_name: "",
  country: "",
  job_type: "",
  startup_description: "",
  job_description: "",
  specialization: "",
  contact_email: "",
};

const StartupVacancies = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
    if (!form.startup_name || !form.country || !form.job_type || !form.job_description || !form.specialization || !form.contact_email) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    if (editingId) {
      // Update existing vacancy
      const { error } = await supabase
        .from("startup_vacancies")
        .update({
          startup_name: form.startup_name,
          country: form.country,
          job_type: form.job_type,
          startup_description: form.startup_description || null,
          job_description: form.job_description,
          specialization: form.specialization,
          contact_email: form.contact_email,
        } as any)
        .eq("id", editingId);

      setSubmitting(false);
      if (error) {
        toast.error("Failed to update vacancy");
      } else {
        toast.success("Vacancy updated!");
        setVacancies((prev) =>
          prev.map((v) =>
            v.id === editingId
              ? { ...v, ...form, startup_description: form.startup_description || null }
              : v
          )
        );
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
      }
    } else {
      // Create new vacancy
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
          contact_email: form.contact_email,
          approved: false,
        } as any)
        .select()
        .single();

      setSubmitting(false);
      if (error) {
        toast.error("Failed to post vacancy");
      } else {
        toast.success("Vacancy posted! It will be visible after admin approval.");
        setVacancies((prev) => [data as any, ...prev]);
        setForm(emptyForm);
        setShowForm(false);
      }
    }
  };

  const handleEdit = (v: Vacancy) => {
    setForm({
      startup_name: v.startup_name,
      country: v.country,
      job_type: v.job_type,
      startup_description: v.startup_description || "",
      job_description: v.job_description,
      specialization: v.specialization,
      contact_email: v.contact_email || "",
    });
    setEditingId(v.id);
    setShowForm(true);
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

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // Regular users see only approved vacancies + their own
  const visibleVacancies = isAdmin
    ? vacancies
    : vacancies.filter((v) => v.approved || v.user_id === user?.id);

  return (
    <DashboardLayout title="Startup Vacancies" subtitle="Post and browse startup job opportunities.">
      <div className="space-y-6">
        {user && (
          <div className="flex justify-end">
            <Button onClick={() => showForm ? cancelForm() : setShowForm(true)} className="gap-2 gradient-primary text-primary-foreground border-0">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? "Cancel" : "Post Vacancy"}
            </Button>
          </div>
        )}

        {/* Post / Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-8 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{editingId ? "Edit Vacancy" : "Post New Vacancy"}</h3>
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
              <Label>Contact Email *</Label>
              <Input name="contact_email" type="email" placeholder="your@email.com" value={form.contact_email} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Startup Description</Label>
              <Textarea name="startup_description" placeholder="Brief description of your startup" value={form.startup_description} onChange={handleChange} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Job Description *</Label>
              <Textarea name="job_description" placeholder="Describe the role, responsibilities, and requirements" value={form.job_description} onChange={handleChange} rows={4} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground border-0">
                {submitting ? "Saving..." : editingId ? "Update Vacancy" : "Post Vacancy"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelForm}>Cancel Edit</Button>
              )}
            </div>
          </form>
        )}

        {/* Vacancies List */}
        {loading ? (
          <p className="text-muted-foreground">Loading vacancies...</p>
        ) : visibleVacancies.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No vacancies posted yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to post a job opportunity!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleVacancies.map((v) => (
              <div key={v.id} className={`rounded-xl border p-6 shadow-card ${!v.approved ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">{v.startup_name}</h3>
                      {!v.approved && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">{v.country}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">{v.job_type}</span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">{v.specialization}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                    {user?.id === v.user_id && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="text-primary hover:text-primary" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-destructive hover:text-destructive" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {v.startup_description && <p className="text-sm text-muted-foreground mb-3">{v.startup_description}</p>}
                <p className="text-sm text-foreground leading-relaxed mb-3">{v.job_description}</p>
                {v.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${v.contact_email}`} className="hover:underline">{v.contact_email}</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StartupVacancies;