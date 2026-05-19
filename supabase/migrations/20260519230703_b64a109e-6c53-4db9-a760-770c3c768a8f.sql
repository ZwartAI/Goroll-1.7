-- Add template_id to boosters so multiple character "copies" of the same
-- booster can be grouped together for label/owners lookup.
ALTER TABLE public.boosters ADD COLUMN IF NOT EXISTS template_id uuid;

-- Backfill existing rows: each one is its own template by default.
UPDATE public.boosters SET template_id = id WHERE template_id IS NULL;

ALTER TABLE public.boosters ALTER COLUMN template_id SET NOT NULL;

-- Trigger: on insert, default template_id to the row's own id when not provided.
CREATE OR REPLACE FUNCTION public.boosters_default_template_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.template_id IS NULL THEN
    NEW.template_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boosters_default_template_id_trg ON public.boosters;
CREATE TRIGGER boosters_default_template_id_trg
BEFORE INSERT ON public.boosters
FOR EACH ROW EXECUTE FUNCTION public.boosters_default_template_id();

CREATE INDEX IF NOT EXISTS boosters_template_id_idx ON public.boosters(template_id);
CREATE INDEX IF NOT EXISTS boosters_campaign_template_idx ON public.boosters(campaign_id, template_id);