ALTER TABLE public.logs ADD COLUMN IF NOT EXISTS dm_only boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_logs_campaign_dm_only ON public.logs (campaign_id, dm_only);