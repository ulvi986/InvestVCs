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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus, Trash2, X, Pencil, Mail, Clock, Send, Search, MapPin } from "lucide-react";

interface Vacancy {
  id: string; user_id: string; startup_name: string; country: string; job_type: string;
  startup_description: string | null; job_description: string; specialization: string;
  contact_email: string; approved: boolean; created_at: string;
}

const emptyForm = { startup_name: "", country: "", job_type: "", startup_description: "", job_description: "", specialization: "", contact_email: "" };
const emptyContact = { senderName: "", senderEmail: "", subject: "", message: "" };

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

  // Search + filters
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("all");
  const [fCountry, setFCountry] = useState("all");
  const [fSpec, setFSpec] = useState("all");

  // Contact modal state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTo, setContactTo] = useState("");
  const [contactStartup, setContactStartup] = useState("");
  const [contactForm, setContactForm] = useState(emptyContact);
  const [sending, setSending] = useState(false);

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

  const openContactModal = (email: string, startupName: string) => {
    setContactTo(email);
    setContactStartup(startupName);
    setContactForm({ ...emptyContact, subject: `Interest in vacancy at ${startupName}` });
    setContactOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.senderName || !contactForm.senderEmail || !contactForm.subject || !contactForm.message) {
      toast.error(t("vacancies.fill_required"));
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: contactTo,
          subject: contactForm.subject,
          message: contactForm.message,
          senderName: contactForm.senderName,
          senderEmail: contactForm.senderEmail,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(t("vacancies.sent_success"));
      setContactOpen(false);
      setContactForm(emptyContact);
    } catch (err: any) {
      console.error(err);
      toast.error(t("vacancies.sent_error"));
    } finally {
      setSending(false);
    }
  };

  const visibleVacancies = isAdmin ? vacancies : vacancies.filter((v) => v.approved || v.user_id === user?.id);

  const uniqueValues = (key: keyof Vacancy) =>
    Array.from(new Set(visibleVacancies.map((v) => v[key]).filter(Boolean) as string[])).sort();

  const filteredVacancies = visibleVacancies.filter((v) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      [v.startup_name, v.specialization, v.job_description, v.startup_description, v.job_type, v.country]
        .some((s) => (s || "").toLowerCase().includes(q));
    return (
      matchesSearch &&
      (fType === "all" || v.job_type === fType) &&
      (fCountry === "all" || v.country === fCountry) &&
      (fSpec === "all" || v.specialization === fSpec)
    );
  });

  const hasActiveFilters = search.trim() || fType !== "all" || fCountry !== "all" || fSpec !== "all";
  const clearFilters = () => { setSearch(""); setFType("all"); setFCountry("all"); setFSpec("all"); };

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

        {/* Search + filters */}
        {!loading && visibleVacancies.length > 0 && (
          <div className="rounded-2xl border border-white/[0.07] bg-card p-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("vacancies.search_placeholder")}
                className="pl-10 rounded-xl"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-lg text-sm"><SelectValue placeholder={t("vacancies.job_type")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("vacancies.all_types")}</SelectItem>
                  {uniqueValues("job_type").map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fCountry} onValueChange={setFCountry}>
                <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-lg text-sm"><SelectValue placeholder={t("vacancies.country")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("vacancies.all_countries")}</SelectItem>
                  {uniqueValues("country").map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fSpec} onValueChange={setFSpec}>
                <SelectTrigger className="h-9 w-auto min-w-[150px] rounded-lg text-sm"><SelectValue placeholder={t("vacancies.specialization")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("vacancies.all_specs")}</SelectItem>
                  {uniqueValues("specialization").map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground">
                  <X className="h-3.5 w-3.5" /> {t("vacancies.clear")}
                </Button>
              )}
            </div>
          </div>
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
          <>
            <p className="text-sm text-muted-foreground">
              {filteredVacancies.length} / {visibleVacancies.length} {t("vacancies.results")}
            </p>
            {filteredVacancies.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("vacancies.no_match")}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredVacancies.map((v) => (
                  <div
                    key={v.id}
                    className={`group flex flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:border-white/15 ${!v.approved ? "border-amber-500/30 bg-amber-500/[0.04]" : "border-white/[0.07] bg-card"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                        {(v.startup_name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{v.startup_name}</p>
                          <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{v.job_type}</span>
                        </div>
                        <h3 className="mt-0.5 truncate font-semibold text-foreground">{v.specialization}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {v.country}
                        </p>
                      </div>
                      {user?.id === v.user_id && (
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(v)} className="h-7 w-7 text-primary"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                    </div>

                    {!v.approved && (
                      <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                        <Clock className="h-3 w-3" /> {t("vacancies.pending_approval")}
                      </span>
                    )}

                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{v.job_description}</p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                      <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                      {v.contact_email && user && user.id !== v.user_id ? (
                        <Button
                          size="sm"
                          onClick={() => openContactModal(v.contact_email, v.startup_name)}
                          className="h-8 gap-1.5 gradient-primary text-primary-foreground border-0"
                        >
                          <Send className="h-3.5 w-3.5" /> {t("vacancies.contact")}
                        </Button>
                      ) : v.contact_email ? (
                        <a href={`mailto:${v.contact_email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" /> {v.contact_email}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contact Email Modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              {t("vacancies.send_message")} — {contactStartup}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("vacancies.your_name")} *</Label>
              <Input
                value={contactForm.senderName}
                onChange={(e) => setContactForm(p => ({ ...p, senderName: e.target.value }))}
                placeholder={t("vacancies.your_name")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vacancies.your_email")} *</Label>
              <Input
                type="email"
                value={contactForm.senderEmail}
                onChange={(e) => setContactForm(p => ({ ...p, senderEmail: e.target.value }))}
                placeholder={t("vacancies.your_email")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vacancies.subject")} *</Label>
              <Input
                value={contactForm.subject}
                onChange={(e) => setContactForm(p => ({ ...p, subject: e.target.value }))}
                placeholder={t("vacancies.subject")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("vacancies.message")} *</Label>
              <Textarea
                value={contactForm.message}
                onChange={(e) => setContactForm(p => ({ ...p, message: e.target.value }))}
                placeholder={t("vacancies.message")}
                rows={5}
              />
            </div>
            <Button type="submit" disabled={sending} className="w-full gradient-primary text-primary-foreground border-0 gap-2">
              <Send className="h-4 w-4" />
              {sending ? t("vacancies.sending") : t("vacancies.send_message")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StartupVacancies;
