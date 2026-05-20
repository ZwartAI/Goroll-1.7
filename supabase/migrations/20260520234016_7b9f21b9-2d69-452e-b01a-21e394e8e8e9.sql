
CREATE TABLE public.enemy_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'normal',
  role TEXT NOT NULL DEFAULT 'damage',
  biome TEXT,
  icon_key TEXT NOT NULL DEFAULT 'skull',
  color TEXT NOT NULL DEFAULT '#ef4444',
  max_hp INTEGER NOT NULL DEFAULT 10,
  defense INTEGER NOT NULL DEFAULT 0,
  speed TEXT NOT NULL DEFAULT '30',
  base_damage TEXT,
  description TEXT,
  behavior_notes TEXT,
  weaknesses_text TEXT,
  immunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_boss BOOLEAN NOT NULL DEFAULT false,
  is_elite BOOLEAN NOT NULL DEFAULT false,
  created_by_character_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enemy_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.enemy_templates FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_enemy_templates_campaign ON public.enemy_templates(campaign_id);

CREATE TABLE public.enemy_template_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enemy_template_id UUID NOT NULL REFERENCES public.enemy_templates(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'white',
  skill_type TEXT,
  target_shape TEXT,
  targets TEXT,
  dice TEXT,
  range_text TEXT,
  effect TEXT,
  visual_brief TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enemy_template_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.enemy_template_skills FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_enemy_template_skills_template ON public.enemy_template_skills(enemy_template_id);
CREATE INDEX idx_enemy_template_skills_campaign ON public.enemy_template_skills(campaign_id);

CREATE OR REPLACE FUNCTION public.enemy_templates_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enemy_templates_touch BEFORE UPDATE ON public.enemy_templates
FOR EACH ROW EXECUTE FUNCTION public.enemy_templates_touch();

CREATE TRIGGER trg_enemy_template_skills_touch BEFORE UPDATE ON public.enemy_template_skills
FOR EACH ROW EXECUTE FUNCTION public.enemy_templates_touch();
