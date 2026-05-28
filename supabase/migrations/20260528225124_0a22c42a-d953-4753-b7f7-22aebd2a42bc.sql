ALTER TABLE public.campaigns 
ADD COLUMN combat_log_detail_mode TEXT NOT NULL DEFAULT 'normal';

COMMENT ON COLUMN public.campaigns.combat_log_detail_mode IS 'Determines the level of detail for combat logs: minimal, normal, detailed, or dm_private';