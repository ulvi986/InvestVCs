import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Bookmark, BookmarkX, Loader2, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type SavedPost = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  authorName: string;
  authorAvatar?: string;
};

const SavedPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: saves } = await (supabase as any)
      .from("community_post_saves")
      .select("post_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const ids = ((saves as any[]) ?? []).map((s) => s.post_id);
    if (ids.length === 0) { setPosts([]); setLoading(false); return; }

    const [{ data: postRows }, { data: profRows }] = await Promise.all([
      supabase.from("community_posts").select("*").in("id", ids),
      supabase.from("profiles").select("id, name, surname, avatar_url"),
    ]);
    const profMap: Record<string, any> = {};
    ((profRows as any[]) ?? []).forEach((p) => { profMap[p.id] = p; });
    const byId: Record<string, any> = {};
    ((postRows as any[]) ?? []).forEach((p) => { byId[p.id] = p; });

    // preserve saved order
    const ordered = ids
      .map((id) => byId[id])
      .filter(Boolean)
      .map((p) => {
        const a = profMap[p.user_id] || {};
        return {
          ...p,
          authorName: [a.name, a.surname].filter(Boolean).join(" ") || "InvestVCs member",
          authorAvatar: a.avatar_url || undefined,
        } as SavedPost;
      });
    setPosts(ordered);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unsave = async (postId: string) => {
    if (!user) return;
    const prev = posts;
    setPosts((p) => p.filter((x) => x.id !== postId));
    const { error } = await (supabase as any)
      .from("community_post_saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) setPosts(prev);
  };

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-white/80">
        <Bookmark className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">{t("profile.saved_title")}</h3>
        {!loading && posts.length > 0 && (
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/55">
            {posts.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <p className="py-4 text-center text-xs text-white/40">{t("profile.saved_empty")}</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-semibold text-white">
                  {p.authorAvatar ? <img src={p.authorAvatar} alt="" className="h-full w-full object-cover" /> : (p.authorName[0] || "U").toUpperCase()}
                </div>
                <span className="truncate text-xs font-medium text-white">{p.authorName}</span>
                <span className="text-[10px] text-white/30">
                  {(() => { try { return formatDistanceToNow(new Date(p.created_at), { addSuffix: true }); } catch { return ""; } })()}
                </span>
                <button onClick={() => unsave(p.id)} aria-label="Remove from saved"
                  className="ml-auto text-white/30 transition-colors hover:text-[#dd90d8]">
                  <BookmarkX className="h-4 w-4" />
                </button>
              </div>

              {p.content && (
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-white/75">{p.content}</p>
              )}
              {p.image_url && (
                <img src={p.image_url} alt="" loading="lazy" className="mt-2 max-h-40 w-full rounded-xl border border-white/[0.07] object-cover" />
              )}

              <button
                onClick={() => navigate(`/community?post=${p.id}`)}
                className="mt-3 inline-flex items-center gap-1 text-xs text-white/55 transition-colors hover:text-primary"
              >
                {t("profile.saved_view")} <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedPosts;
