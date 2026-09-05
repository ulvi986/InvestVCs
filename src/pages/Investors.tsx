import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Loader2, Users, Mail, Building2, MapPin, UserX } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { gmailComposeUrl } from "@/lib/contact";

type Investor = {
  id: string;
  name: string | null;
  surname: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  current_company: string | null;
  industry: string | null;
  country: string | null;
  email: string | null;
};

const initials = (i: Investor) =>
  ((i.name?.[0] || "") + (i.surname?.[0] || "")).toUpperCase() || "I";

const Investors = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("list_investors");
      if (active) {
        if (!error && data) setInvestors(data as Investor[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <DashboardLayout title={t("investors.title")} subtitle={t("investors.subtitle")}>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : investors.length === 0 ? (
        <div className="rounded-3xl border border-[var(--rule)] bg-card p-12 text-center">
          <UserX className="mx-auto mb-3 h-10 w-10 text-[var(--ink-3)]" />
          <p className="font-origin-display text-xl font-light text-[var(--ink-1)]">{t("eval.investors_empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {investors.map((inv, i) => {
            const fullName = [inv.name, inv.surname].filter(Boolean).join(" ") || "Investor";
            const sub = [inv.current_company, inv.industry].filter(Boolean).join(" · ");
            return (
              <motion.div
                key={inv.id}
                className="flex flex-col rounded-3xl border border-[var(--rule)] bg-card p-5"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/u/${inv.id}`)}
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold text-[var(--ink-1)] transition-opacity hover:opacity-80"
                  >
                    {inv.avatar_url ? <img src={inv.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(inv)}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/u/${inv.id}`)} className="block truncate font-medium text-[var(--ink-1)] hover:text-primary">
                      {fullName}
                    </button>
                    {sub && (
                      <p className="flex items-center gap-1 truncate text-xs text-[var(--ink-3)]">
                        <Building2 className="h-3 w-3 shrink-0" /> {sub}
                      </p>
                    )}
                  </div>
                </div>

                {inv.country && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--ink-3)]">
                    <MapPin className="h-3.5 w-3.5" /> {inv.country}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {inv.email && (
                    <a href={gmailComposeUrl(inv.email)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--band)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-colors hover:bg-[var(--band)]">
                      <Mail className="h-3.5 w-3.5 text-primary" /> {t("eval.investors_contact")}
                    </a>
                  )}
                  {inv.linkedin_url && (
                    <a href={inv.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--band)] px-3 py-1.5 text-xs text-[var(--ink-2)] transition-colors hover:bg-[var(--band)]">
                      <Linkedin className="h-3.5 w-3.5 text-[#90b8f0]" /> LinkedIn
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Investors;
