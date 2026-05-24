ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS stats_setup_completed boolean NOT NULL DEFAULT false;

-- Mark all pre-existing characters as already completed so only new ones
-- go through the forced initial stats screen.
UPDATE public.characters SET stats_setup_completed = true;

-- New characters going forward should default to "not completed".
ALTER TABLE public.characters
  ALTER COLUMN stats_setup_completed SET DEFAULT false;