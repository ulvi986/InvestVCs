import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Briefcase, Plus, Trash2, X, Pencil, Mail, Clock } from "lucide-react";

interface Vacancy {
  id: string; user_id: string; startup_name: string; country: string; job_type: string;
  startup_description: string | null; job_description: string; specialization: string;
  contact_email: string; approved: boolean; created_at: string;
}

const emptyForm = { startup_name: "", country: "", job_type: "", startup_description: "", job_description: "", specialization: "", contact_email: "" };

const StartupVacancies = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { t } = useLanguage();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("startup_vacancies").select("*").order("created_at", { ascending: false });
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
      toast.error(t("vacancies.fill_required"));
      return;
    }
    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase.from("startup_vacancies").update({
        startup_name: form.startup_name, country: form.country, job_type: form.job_type,
        startup_description: form.startup_description || null, job_description: form.job_description,
        specialization: form.specialization, contact_email: form.contact_email,
      } as any).eq("id", editingId);
      setSubmitting(false);
      if (error) toast.error("Error");
      else {
        toast.success(t("vacancies.updated_success"));
        setVacancies((prev) => prev.map((v) => v.id === editingId ? { ...v, ...form, startup_description: form.startup_description || null } : v));
        setForm(emptyForm); setEditingId(null); setShowForm(false);
      }
    } else {
      const { data, error } = await supabase.from("startup_vacancies").insert({
        user_id: user.id, startup_name: form.startup_name, country: form.country, job_type: form.job_type,
        startup_description: form.startup_description || null, job_description: form.job_description,
        specialization: form.specialization, contact_email: form.contact_email, approved: false,
      } as any).select().single();
      setSubmitting(false);
      if (error) toast.error("Error");
      else {
        toast.success(t("vacancies.posted_success"));
        setVacancies((prev) => [data as any, ...prev]);
        setForm(emptyForm); setShowForm(false);
      }
    }
  };

  const handleEdit = (v: Vacancy) => {
    setForm({ startup_name: v.startup_name, country: v.country, job_type: v.job_type, startup_description: v.startup_description || "", job_description: v.job_description, specialization: v.specialization, contact_email: v.contact_email || "" });
    setEditingId(v.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("startup_vacancies").delete().eq("id", id);
    if (error) toast.error("Error");
    else { setVacancies((prev) => prev.filter((v) => v.id !== id)); toast.success(t("vacancies.deleted")); }
  };

  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm); };

  const visibleVacancies = isAdmin ? vacancies : vacancies.filter((v) => v.approved || v.user_id === user?.id);

  return (
    <DashboardLayout title={t("vacancies.title")} subtitle="">
      <div className="space-y-6">
        {user && (
          <div className="flex justify-end">
            <Button onClick={() => showForm ? cancelForm() : setShowForm(true)} className="gap-2 gradient-primary text-primary-foreground border-0">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? t("vacancies.cancel") : t("vacancies.post_vacancy")}
            </Button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-primary/20 bg-primary/5 p-6 mb-8 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{editingId ? t("vacancies.edit_vacancy") : t("vacancies.post_new")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("vacancies.startup_name")} *</Label><Input name="startup_name" placeholder={t("vacancies.startup_name")} value={form.startup_name} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>{t("vacancies.country")} *</Label><Input name="country" placeholder={t("vacancies.country")} value={form.country} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>{t("vacancies.job_type")} *</Label><Input name="job_type" placeholder={t("vacancies.job_type")} value={form.job_type} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>{t("vacancies.specialization")} *</Label><Input name="specialization" placeholder={t("vacancies.specialization")} value={form.specialization} onChange={handleChange} /></div>
            </div>
            <div className="space-y-2"><Label>{t("vacancies.contact_email")} *</Label><Input name="contact_email" type="email" placeholder="email@example.com" value={form.contact_email} onChange={handleChange} /></div>
            <div className="space-y-2"><Label>{t("vacancies.startup_desc")}</Label><Textarea name="startup_description" placeholder={t("vacancies.startup_desc")} value={form.startup_description} onChange={handleChange} rows={2} /></div>
            <div className="space-y-2"><Label>{t("vacancies.job_desc")} *</Label><Textarea name="job_description" placeholder={t("vacancies.job_desc")} value={form.job_description} onChange={handleChange} rows={4} /></div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="gradient-primary text-primary-foreground border-0">
                {submitting ? t("vacancies.saving") : editingId ? t("vacancies.update") : t("vacancies.post_vacancy")}
              </Button>
              {editingId && (<Button type="button" variant="outline" onClick={cancelForm}>{t("vacancies.cancel_edit")}</Button>)}
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : visibleVacancies.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{t("vacancies.no_vacancies")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("vacancies.be_first")}</p>
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
                          <Clock className="h-3 w-3" /> {t("vacancies.pending_approval")}
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="text-primary hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
