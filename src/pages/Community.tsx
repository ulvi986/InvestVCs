import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Linkedin, Send, Trash2, Loader2, MessageSquare, Globe, ImagePlus, X, Heart, Bookmark, Share2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import TrendsPanel from "@/components/TrendsPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Author = {
  name?: string;
  surname?: string;
  avatar_url?: string;
  linkedin_url?: string;
  startup_name?: string;
  current_company?: string;
  industry?: string;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  author: Author;
};

type Reply = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: Author;
};

const initialsOf = (a: Author, fallback = "U") =>
  ((a.name?.[0] || "") + (a.surname?.[0] || "")).toUpperCase() || fallback;

const headlineOf = (a: Author) =>
  [a.startup_name || a.current_company, a.industry].filter(Boolean).join(" · ");

const Avatar = ({ author, size = 44 }: { author: Author; size?: number }) => (
  <div
    className="shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-semibold text-white"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {author.avatar_url ? (
      <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      initialsOf(author)
    )}
  </div>
);

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Author>>({});
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [repliesByPost, setRepliesByPost] = useState<Record<string, Reply[]>>({});
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);

  const [likesByPost, setLikesByPost] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const load = async () => {
    const [postRes, profRes, replyRes, likeRes, saveRes] = await Promise.all([
      supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, name, surname, avatar_url, linkedin_url, startup_name, current_company, industry"),
      (supabase as any).from("community_post_replies").select("*").order("created_at", { ascending: true }).limit(2000),
      (supabase as any).from("community_post_likes").select("post_id, user_id").limit(5000),
      user
        ? (supabase as any).from("community_post_saves").select("post_id").eq("user_id", user.id).limit(2000)
        : Promise.resolve({ data: [] }),
    ]);
    const profs = (profRes.data as any[]) ?? [];
    const map: Record<string, Author> = {};
    profs.forEach((p) => {
      map[p.id] = {
        name: p.name, surname: p.surname, avatar_url: p.avatar_url || undefined,
        linkedin_url: p.linkedin_url || undefined, startup_name: p.startup_name || undefined,
        current_company: p.current_company || undefined, industry: p.industry || undefined,
      };
    });
    setProfilesById(map);
    const rows = (postRes.data as any[]) ?? [];
    setPosts(rows.map((r) => ({ ...r, author: map[r.user_id] || {} })));

    const replyRows = (replyRes.data as any[]) ?? [];
    const grouped: Record<string, Reply[]> = {};
    replyRows.forEach((r) => {
      (grouped[r.post_id] ||= []).push({ ...r, author: map[r.user_id] || {} });
    });
    setRepliesByPost(grouped);

    const likeRows = (likeRes.data as any[]) ?? [];
    const likeMap: Record<string, { count: number; liked: boolean }> = {};
    likeRows.forEach((l) => {
      const entry = (likeMap[l.post_id] ||= { count: 0, liked: false });
      entry.count += 1;
      if (user && l.user_id === user.id) entry.liked = true;
    });
    setLikesByPost(likeMap);

    const saveRows = (saveRes.data as any[]) ?? [];
    setSavedSet(new Set(saveRows.map((s) => s.post_id)));

    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When opened via a shared link (?post=ID), scroll to that post.
  useEffect(() => {
    if (loading || posts.length === 0) return;
    const target = new URLSearchParams(window.location.search).get("post");
    if (!target) return;
    const el = document.getElementById(`post-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/60");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/60"), 2200);
    }
  }, [loading, posts]);

  const myAuthor = useMemo<Author>(() => (user ? profilesById[user.id] || {} : {}), [user, profilesById]);

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handlePost = async () => {
    const text = content.trim();
    if ((!text && !imageFile) || !user) return;
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("community")
          .upload(path, imageFile, { cacheControl: "3600" });
        if (upErr) throw upErr;
        image_url = supabase.storage.from("community").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, content: text, image_url } as any)
        .select("*")
        .single();
      if (error) throw error;
      const newPost: Post = { ...(data as any), author: profilesById[user.id] || {} };
      setPosts((prev) => [newPost, ...prev]);
      setContent("");
      clearImage();
      toast.success("Shared with the community ✓");
    } catch (err: any) {
      toast.error(err?.message || "Could not post");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = posts;
    setPosts((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) {
      setPosts(prev);
      toast.error("Could not delete");
    }
  };

  const handleReply = async (postId: string) => {
    const text = (replyText[postId] || "").trim();
    if (!text || !user) return;
    setReplyBusy(postId);
    try {
      const { data, error } = await (supabase as any)
        .from("community_post_replies")
        .insert({ post_id: postId, user_id: user.id, content: text })
        .select("*")
        .single();
      if (error) throw error;
      const newReply: Reply = { ...(data as any), author: profilesById[user.id] || {} };
      setRepliesByPost((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), newReply] }));
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      setOpenReplies((prev) => ({ ...prev, [postId]: true }));
    } catch (err: any) {
      toast.error(err?.message || "Could not reply");
    } finally {
      setReplyBusy(null);
    }
  };

  const handleDeleteReply = async (postId: string, replyId: string) => {
    const prev = repliesByPost[postId] || [];
    setRepliesByPost((p) => ({ ...p, [postId]: prev.filter((r) => r.id !== replyId) }));
    const { error } = await (supabase as any).from("community_post_replies").delete().eq("id", replyId);
    if (error) {
      setRepliesByPost((p) => ({ ...p, [postId]: prev }));
      toast.error("Could not delete reply");
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    const cur = likesByPost[postId] || { count: 0, liked: false };
    const nextLiked = !cur.liked;
    const optimistic = { count: Math.max(0, cur.count + (nextLiked ? 1 : -1)), liked: nextLiked };
    setLikesByPost((p) => ({ ...p, [postId]: optimistic }));
    const q = nextLiked
      ? (supabase as any).from("community_post_likes").insert({ post_id: postId, user_id: user.id })
      : (supabase as any).from("community_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    const { error } = await q;
    if (error) setLikesByPost((p) => ({ ...p, [postId]: cur })); // revert
  };

  const handleSave = async (postId: string) => {
    if (!user) return;
    const wasSaved = savedSet.has(postId);
    setSavedSet((prev) => {
      const n = new Set(prev);
      if (wasSaved) n.delete(postId); else n.add(postId);
      return n;
    });
    const q = wasSaved
      ? (supabase as any).from("community_post_saves").delete().eq("post_id", postId).eq("user_id", user.id)
      : (supabase as any).from("community_post_saves").insert({ post_id: postId, user_id: user.id });
    const { error } = await q;
    if (error) {
      setSavedSet((prev) => {
        const n = new Set(prev);
        if (wasSaved) n.add(postId); else n.delete(postId);
        return n;
      });
      toast.error("Could not update saved");
    } else if (!wasSaved) {
      toast.success("Saved to your profile");
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/community?post=${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — share it anywhere");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <DashboardLayout title="Community" subtitle="Share updates, wins and ideas with founders & investors">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
        {/* Composer */}
        <div className="rounded-3xl border border-white/[0.07] bg-card p-5">
          <div className="flex gap-3">
            <Avatar author={myAuthor} />
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share something with the community…"
                rows={3}
                className="resize-none border-white/[0.07] bg-white/[0.02]"
              />

              {imagePreview && (
                <div className="relative mt-3 inline-block">
                  <img src={imagePreview} alt="" className="max-h-64 rounded-2xl border border-white/[0.07] object-cover" />
                  <button
                    onClick={clearImage}
                    aria-label="Remove image"
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/80 backdrop-blur transition-colors hover:bg-black/80 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickImage}
              />

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={posting}
                    aria-label="Add image"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Photo
                  </button>
                  <span className="text-xs text-white/35">{content.length}/2000</span>
                </div>
                <Button
                  variant="white"
                  size="sm"
                  className="origin-shimmer"
                  disabled={posting || (!content.trim() && !imageFile) || content.length > 2000}
                  onClick={handlePost}
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Post <Send className="ml-1 h-3.5 w-3.5" /></>}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.07] bg-card p-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="font-origin-display text-xl font-light text-white">No posts yet</p>
            <p className="mt-1 text-sm text-white/45">Be the first to share something with the community.</p>
          </div>
        ) : (
          posts.map((post, i) => {
            const a = post.author;
            const headline = headlineOf(a);
            const fullName = [a.name, a.surname].filter(Boolean).join(" ") || "InvestVCs member";
            return (
              <motion.article
                key={post.id}
                id={`post-${post.id}`}
                className="scroll-mt-24 rounded-3xl border border-white/[0.07] bg-card p-5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.45 }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => navigate(`/u/${post.user_id}`)}
                    aria-label={`View ${fullName}'s profile`}
                    className="transition-opacity hover:opacity-80"
                  >
                    <Avatar author={a} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/u/${post.user_id}`)}
                        className="truncate font-medium text-white transition-colors hover:text-primary"
                      >
                        {fullName}
                      </button>
                      {a.linkedin_url && (
                        <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                          className="text-[#90b8f0] hover:text-white transition-colors">
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {headline && <p className="truncate text-xs text-white/45">{headline}</p>}
                    <p className="text-[11px] text-white/30">
                      {(() => { try { return formatDistanceToNow(new Date(post.created_at), { addSuffix: true }); } catch { return ""; } })()}
                    </p>
                  </div>
                  {user?.id === post.user_id && (
                    <button onClick={() => handleDelete(post.id)} aria-label="Delete"
                      className="text-white/30 transition-colors hover:text-[#dd90d8]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {post.content && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{post.content}</p>
                )}

                {post.image_url && (
                  <a href={post.image_url} target="_blank" rel="noopener noreferrer" className="mt-4 block">
                    <img
                      src={post.image_url}
                      alt=""
                      loading="lazy"
                      className="max-h-[28rem] w-full rounded-2xl border border-white/[0.07] object-cover"
                    />
                  </a>
                )}

                {a.linkedin_url && (
                  <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/[0.07]">
                    <Linkedin className="h-3.5 w-3.5 text-[#90b8f0]" /> Connect on LinkedIn
                  </a>
                )}

                {/* Actions + replies */}
                {(() => {
                  const replies = repliesByPost[post.id] || [];
                  const isOpen = openReplies[post.id] || false;
                  const like = likesByPost[post.id] || { count: 0, liked: false };
                  const saved = savedSet.has(post.id);
                  return (
                    <div className="mt-4 border-t border-white/[0.06] pt-3">
                      <div className="flex items-center gap-1 text-white/45">
                        <button
                          onClick={() => handleLike(post.id)}
                          aria-label="Like"
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/[0.04] ${like.liked ? "text-[#dd90d8]" : "hover:text-white/80"}`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${like.liked ? "fill-current" : ""}`} />
                          {like.count > 0 && <span>{like.count}</span>}
                        </button>
                        <button
                          onClick={() => setOpenReplies((prev) => ({ ...prev, [post.id]: !isOpen }))}
                          aria-label="Comment"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/[0.04] hover:text-white/80"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {replies.length > 0 && <span>{replies.length}</span>}
                        </button>
                        <button
                          onClick={() => handleSave(post.id)}
                          aria-label="Save"
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/[0.04] ${saved ? "text-primary" : "hover:text-white/80"}`}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleShare(post.id)}
                          aria-label="Share"
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/[0.04] hover:text-white/80"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-3">
                          {replies.map((r) => {
                            const ra = r.author;
                            const rName = [ra.name, ra.surname].filter(Boolean).join(" ") || "InvestVCs member";
                            return (
                              <div key={r.id} className="flex items-start gap-2.5">
                                <button onClick={() => navigate(`/u/${r.user_id}`)} className="transition-opacity hover:opacity-80">
                                  <Avatar author={ra} size={30} />
                                </button>
                                <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.03] px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => navigate(`/u/${r.user_id}`)} className="truncate text-xs font-medium text-white hover:text-primary">
                                      {rName}
                                    </button>
                                    <span className="text-[10px] text-white/30">
                                      {(() => { try { return formatDistanceToNow(new Date(r.created_at), { addSuffix: true }); } catch { return ""; } })()}
                                    </span>
                                    {user?.id === r.user_id && (
                                      <button onClick={() => handleDeleteReply(post.id, r.id)} aria-label="Delete reply"
                                        className="ml-auto text-white/25 transition-colors hover:text-[#dd90d8]">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/75">{r.content}</p>
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex items-start gap-2.5">
                            <Avatar author={myAuthor} size={30} />
                            <div className="flex flex-1 items-end gap-2">
                              <Textarea
                                value={replyText[post.id] || ""}
                                onChange={(e) => setReplyText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(post.id); }
                                }}
                                placeholder="Write a reply…"
                                rows={1}
                                maxLength={1000}
                                className="min-h-[40px] resize-none border-white/[0.07] bg-white/[0.02] text-sm"
                              />
                              <Button
                                variant="white" size="sm"
                                disabled={replyBusy === post.id || !(replyText[post.id] || "").trim()}
                                onClick={() => handleReply(post.id)}
                              >
                                {replyBusy === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.article>
            );
          })
        )}

        <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-white/30">
          <Globe className="h-3.5 w-3.5" /> Everyone in the InvestVCs community can see what you share.
        </p>
        </div>

        <TrendsPanel />
      </div>
    </DashboardLayout>
  );
};

export default Community;
