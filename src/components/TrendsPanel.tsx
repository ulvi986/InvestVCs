import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { TrendingUp, Loader2, Hash } from "lucide-react";

type Trend = {
  topic: string;
  mentions: number;
  posts: number;
  last_used: string;
};

const TrendsPanel = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_trending_topics", { _days: 7, _limit: 8 });
      if (active) {
        if (!error && data) setTrends(data as Trend[]);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-3xl border border-white/[0.07] bg-card p-5">
        <div className="mb-1 flex items-center gap-2 text-white/80">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">{t("trends.title")}</h3>
        </div>
        <p className="mb-4 text-[11px] text-white/40">{t("trends.subtitle")}</p>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : trends.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/40">{t("trends.empty")}</p>
        ) : (
          <ol className="space-y-2.5">
            {trends.map((tr, i) => (
              <li key={tr.topic}>
                <button
                  onClick={() => navigate("/community")}
                  className="group flex w-full items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="mt-0.5 font-origin-display text-lg font-light text-white/30">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium text-white group-hover:text-primary">
                      <Hash className="h-3.5 w-3.5 shrink-0 text-primary" />{tr.topic}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/45">
                      {t("trends.why")
                        .replace("{posts}", String(tr.posts))
                        .replace("{mentions}", String(tr.mentions))}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
};

export default TrendsPanel;
