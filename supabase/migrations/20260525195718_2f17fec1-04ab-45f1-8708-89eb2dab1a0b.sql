ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS player_join_mode text NOT NULL DEFAULT 'request';