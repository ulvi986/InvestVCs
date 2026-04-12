
-- Create funding_rounds table for per-round investment data
CREATE TABLE public.funding_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  round_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  investor_name TEXT,
  date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rounds" ON public.funding_rounds FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investors can read all rounds" ON public.funding_rounds FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'investor'::app_role));

CREATE POLICY "Admins can read all rounds" ON public.funding_rounds FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rounds" ON public.funding_rounds FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_funding_rounds_updated_at
  BEFORE UPDATE ON public.funding_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add approved and message columns to funding_interests
ALTER TABLE public.funding_interests
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message TEXT;
