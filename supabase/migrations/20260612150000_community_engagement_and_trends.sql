-- Community engagement: likes (reactions) + saves (bookmarks), and a trends
-- function that ranks hashtag topics from recent posts.

-- ── Likes / reactions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read all likes" ON public.community_post_likes;
CREATE POLICY "Authenticated can read all likes"
  ON public.community_post_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can like" ON public.community_post_likes;
CREATE POLICY "Users can like"
  ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.community_post_likes;
CREATE POLICY "Users can unlike"
  ON public.community_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_post_likes_post_id_idx ON public.community_post_likes (post_id);

-- ── Saves / bookmarks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.community_post_saves ENABLE ROW LEVEL SECURITY;

-- A user only ever needs to see / manage their own saves.
DROP POLICY IF EXISTS "Users can read own saves" ON public.community_post_saves;
CREATE POLICY "Users can read own saves"
  ON public.community_post_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save" ON public.community_post_saves;
CREATE POLICY "Users can save"
  ON public.community_post_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave" ON public.community_post_saves;
CREATE POLICY "Users can unsave"
  ON public.community_post_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS community_post_saves_user_id_idx ON public.community_post_saves (user_id, created_at DESC);

-- ── Trending topics ─────────────────────────────────────────────────
-- Ranks #hashtags found in posts from the last _days, weighted by total
-- mentions and how many distinct posts use them (breadth), plus recency.
CREATE OR REPLACE FUNCTION public.get_trending_topics(_days integer DEFAULT 7, _limit integer DEFAULT 8)
RETURNS TABLE (
  topic text,
  mentions bigint,
  posts bigint,
  last_used timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(m[1]) AS topic,
         count(*)::bigint AS mentions,
         count(DISTINCT p.id)::bigint AS posts,
         max(p.created_at) AS last_used
  FROM public.community_posts p
  CROSS JOIN LATERAL regexp_matches(p.content, '#([A-Za-z0-9_]{2,30})', 'g') AS m
  WHERE p.created_at > now() - make_interval(days => _days)
  GROUP BY lower(m[1])
  ORDER BY count(DISTINCT p.id) DESC, count(*) DESC, max(p.created_at) DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_topics(integer, integer) TO authenticated;
