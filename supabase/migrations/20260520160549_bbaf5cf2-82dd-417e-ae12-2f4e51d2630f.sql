-- 1. Skill Points on character
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS skill_points integer NOT NULL DEFAULT 0;

-- 2. Per-character skills
CREATE TABLE IF NOT EXISTS public.character_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  character_id uuid NOT NULL,
  name text NOT NULL,
  name_key text NOT NULL,
  rarity public.item_rarity NOT NULL DEFAULT 'white',
  type text,
  effect text,
  dice text,
  range_targets text,
  visual_brief text,
  cost integer NOT NULL DEFAULT 1,
  is_unlocked boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'dm_created',
  order_index integer NOT NULL DEFAULT 0,
  imported_row_index integer,
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_skills_uniq_name UNIQUE (character_id, name_key)
);

CREATE INDEX IF NOT EXISTS idx_character_skills_character ON public.character_skills(character_id);
CREATE INDEX IF NOT EXISTS idx_character_skills_campaign ON public.character_skills(campaign_id);

ALTER TABLE public.character_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON public.character_skills
  FOR ALL USING (true) WITH CHECK (true);

-- 3. updated_at trigger function (idempotent — reuses existing if any)
CREATE OR REPLACE FUNCTION public.character_skills_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS character_skills_touch_trg ON public.character_skills;
CREATE TRIGGER character_skills_touch_trg
  BEFORE UPDATE ON public.character_skills
  FOR EACH ROW EXECUTE FUNCTION public.character_skills_touch();

-- 4. Realtime
ALTER TABLE public.character_skills REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_skills;