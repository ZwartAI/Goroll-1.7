
ALTER TABLE public.boosters
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS modo_lanzamiento text,
  ADD COLUMN IF NOT EXISTS distancia text,
  ADD COLUMN IF NOT EXISTS objetivos text,
  ADD COLUMN IF NOT EXISTS dados text,
  ADD COLUMN IF NOT EXISTS efecto text;

CREATE UNIQUE INDEX IF NOT EXISTS boosters_campaign_external_id_uniq
  ON public.boosters (campaign_id, lower(external_id))
  WHERE external_id IS NOT NULL AND external_id <> '';
