
-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create startup_funding table
CREATE TABLE public.startup_funding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  funding_raised NUMERIC DEFAULT 0,
  funding_goal NUMERIC DEFAULT 0,
  funding_stage TEXT DEFAULT 'pre-seed',
  last_round_amount NUMERIC DEFAULT 0,
  last_round_date DATE,
  last_round_investor_type TEXT DEFAULT '',
  use_product_pct NUMERIC DEFAULT 0,
  use_marketing_pct NUMERIC DEFAULT 0,
  use_team_pct NUMERIC DEFAULT 0,
  valuation NUMERIC DEFAULT 0,
  timeline TEXT DEFAULT '',
  interest_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_funding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funding" ON public.startup_funding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own funding" ON public.startup_funding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own funding" ON public.startup_funding FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Investors can view all funding" ON public.startup_funding FOR SELECT USING (public.has_role(auth.uid(), 'investor'));

-- Create funding_interests table
CREATE TABLE public.funding_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'investor',
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_user_id, investor_user_id)
);

ALTER TABLE public.funding_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interests on their startup" ON public.funding_interests FOR SELECT USING (auth.uid() = startup_user_id);
CREATE POLICY "Users can view their own interests" ON public.funding_interests FOR SELECT USING (auth.uid() = investor_user_id);
CREATE POLICY "Authenticated users can insert interest" ON public.funding_interests FOR INSERT WITH CHECK (auth.uid() = investor_user_id);

-- Trigger for updated_at on startup_funding
CREATE TRIGGER update_startup_funding_updated_at
BEFORE UPDATE ON public.startup_funding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
