
-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('bmc', 'pitch_deck', 'both')),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vouchers"
ON public.vouchers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Voucher redemptions
CREATE TABLE public.voucher_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('bmc', 'pitch_deck')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voucher_id, user_id, analysis_type)
);

ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own redemptions"
ON public.voucher_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
ON public.voucher_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage redemptions"
ON public.voucher_redemptions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Business Model Canvas
CREATE TABLE public.business_model_canvas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  canvas_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis_result TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_model_canvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own canvas"
ON public.business_model_canvas FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all canvas"
ON public.business_model_canvas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Investors can read all canvas"
ON public.business_model_canvas FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'investor'));

-- Pitch Deck Analyses
CREATE TABLE public.pitch_deck_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  slide_count INTEGER,
  analysis_result TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pitch_deck_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pitch decks"
ON public.pitch_deck_analyses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all pitch decks"
ON public.pitch_deck_analyses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Investors can read all pitch decks"
ON public.pitch_deck_analyses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'investor'));

-- Storage bucket for pitch decks
INSERT INTO storage.buckets (id, name, public) VALUES ('pitch-decks', 'pitch-decks', false);

CREATE POLICY "Users can upload own pitch decks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own pitch decks"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pitch-decks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can read all pitch decks storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pitch-decks' AND public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to read voucher codes (for validation)
CREATE POLICY "Users can read vouchers for validation"
ON public.vouchers FOR SELECT
TO authenticated
USING (true);
