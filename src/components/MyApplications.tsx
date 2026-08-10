import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Briefcase, Loader2, MapPin, Mail } from "lucide-react";
import { gmailComposeUrl } from "@/lib/contact";

type Applied = {
  id: string;
  specialization: string;
  startup_name: string;
  job_type: string;
  country: string;
  contact_email: string | null;
  appliedAt: string;
};

const MyApplications = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState<Applied[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: apps } = await (supabase as any)
        .from("job_applications")
        .select("vacancy_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const rows = (apps as any[]) ?? [];
      const ids = rows.map((a) => a.vacancy_id);
      if (ids.length === 0) { setItems([]); setLoading(false); return; }
      const { data: vac } = await supabase.from("startup_vacancies").select("*").in("id", ids);
      const byId: Record<string, any> = {};
      ((vac as any[]) ?? []).forEach((v) => { byId[v.id] = v; });
      setItems(
        rows
          .map((a) => { const v = byId[a.vacancy_id]; return v ? { ...v, appliedAt: a.created_at } : null; })
          .filter(Boolean) as Applied[]
      );
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-white/80">
        <Briefcase className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t("applications.title")}</h3>
        {!loading && items.length > 0 && (
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/55">{items.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/40">{t("applications.empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{a.specialization}</p>
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">{a.job_type}</span>
                  </div>
                  <p className="text-sm text-white/55">{a.startup_name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-white/45"><MapPin className="h-3.5 w-3.5" /> {a.country}</p>
                </div>
                <span className="shrink-0 text-[11px] text-white/35">{new Date(a.appliedAt).toLocaleDateString()}</span>
              </div>
              {a.contact_email && (
                <a href={gmailComposeUrl(a.contact_email)} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {t("vacancies.contact")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
