
-- Evaluations table (one row per user)
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  berkus NUMERIC NOT NULL DEFAULT 0,
  scorecard NUMERIC NOT NULL DEFAULT 0,
  risk_factor NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own evaluations"
  ON public.evaluations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluations"
  ON public.evaluations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluations"
  ON public.evaluations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Financial snapshots table (multiple per user)
CREATE TABLE public.financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON public.financial_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.financial_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.financial_snapshots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Readiness answers table (one row per user)
CREATE TABLE public.readiness_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trl_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  crl_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  frl_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.readiness_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own readiness"
  ON public.readiness_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readiness"
  ON public.readiness_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own readiness"
  ON public.readiness_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
