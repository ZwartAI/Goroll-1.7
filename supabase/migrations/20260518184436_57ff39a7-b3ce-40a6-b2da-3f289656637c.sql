ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS level int NOT NULL DEFAULT 1;

ALTER TABLE public.dm_join_requests ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'codm';

CREATE TABLE IF NOT EXISTS public.campaign_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  banned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaign_bans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaign_bans' AND policyname='public_all') THEN
    EXECUTE 'CREATE POLICY public_all ON public.campaign_bans FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;