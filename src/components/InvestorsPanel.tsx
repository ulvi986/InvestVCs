import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { Linkedin, Loader2, Users, Mail, Building2 } from "lucide-react";

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

const InvestorsPanel = () => {
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
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-3xl border border-white/[0.07] bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-white/80">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("eval.investors_title")}</h3>
          {!loading && (
            <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/55">
              {investors.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : investors.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/40">{t("eval.investors_empty")}</p>
        ) : (
          <div className="space-y-2.5">
            {investors.map((inv) => {
              const fullName = [inv.name, inv.surname].filter(Boolean).join(" ") || "Investor";
              const sub = [inv.current_company, inv.industry].filter(Boolean).join(" · ");
              return (
                <div key={inv.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/u/${inv.id}`)}
                      className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-white transition-opacity hover:opacity-80"
                    >
                      {inv.avatar_url ? <img src={inv.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(inv)}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => navigate(`/u/${inv.id}`)} className="block truncate text-sm font-medium text-white hover:text-primary">
                        {fullName}
                      </button>
                      {sub && (
                        <p className="flex items-center gap-1 truncate text-[11px] text-white/45">
                          <Building2 className="h-3 w-3 shrink-0" /> {sub}
                        </p>
                      )}
                    </div>
                  </div>
                  {(inv.email || inv.linkedin_url) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {inv.email && (
                        <a href={`mailto:${inv.email}`} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.07]">
                          <Mail className="h-3 w-3 text-primary" /> {t("eval.investors_contact")}
                        </a>
                      )}
                      {inv.linkedin_url && (
                        <a href={inv.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.07]">
                          <Linkedin className="h-3 w-3 text-[#90b8f0]" /> LinkedIn
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default InvestorsPanel;
