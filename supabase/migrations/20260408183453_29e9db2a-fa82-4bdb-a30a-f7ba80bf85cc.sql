
ALTER TABLE public.evaluations
ADD COLUMN berkus_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN scorecard_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN scorecard_median numeric NOT NULL DEFAULT 0,
ADD COLUMN risk_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN vc_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN chicago_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
