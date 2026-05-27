
-- NPC templates
CREATE TABLE public.npc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  name text NOT NULL,
  npc_type text NOT NULL DEFAULT 'civilian',
  role text NOT NULL DEFAULT 'support',
  biome text,
  icon_key text NOT NULL DEFAULT 'user',
  color text NOT NULL DEFAULT '#60a5fa',
  max_hp integer NOT NULL DEFAULT 10,
  defense integer NOT NULL DEFAULT 0,
  speed text NOT NULL DEFAULT '30',
  base_damage text,
  description text,
  personality text,
  lore text,
  service_notes text,
  behavior_notes text,
  weaknesses_text text,
  immunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  disposition text NOT NULL DEFAULT 'neutral',
  tier text NOT NULL DEFAULT 'normal',
  is_boss boolean NOT NULL DEFAULT false,
  is_elite boolean NOT NULL DEFAULT false,
  created_by_character_id uuid,
  image_url text NOT NULL DEFAULT '',
  image_offset_x numeric NOT NULL DEFAULT 50,
  image_offset_y numeric NOT NULL DEFAULT 50,
  image_scale numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.npc_templates TO anon, authenticated;
GRANT ALL ON public.npc_templates TO service_role;

ALTER TABLE public.npc_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.npc_templates FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER npc_templates_touch
  BEFORE UPDATE ON public.npc_templates
  FOR EACH ROW EXECUTE FUNCTION public.enemy_templates_touch();

CREATE INDEX idx_npc_templates_campaign ON public.npc_templates(campaign_id);

-- NPC template skills
CREATE TABLE public.npc_template_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  npc_template_id uuid NOT NULL REFERENCES public.npc_templates(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL,
  name text NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'white',
  skill_type text,
  target_shape text,
  targets text,
  dice text,
  range_text text,
  effect text,
  visual_brief text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.npc_template_skills TO anon, authenticated;
GRANT ALL ON public.npc_template_skills TO service_role;

ALTER TABLE public.npc_template_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.npc_template_skills FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER npc_template_skills_touch
  BEFORE UPDATE ON public.npc_template_skills
  FOR EACH ROW EXECUTE FUNCTION public.enemy_templates_touch();

CREATE INDEX idx_npc_template_skills_template ON public.npc_template_skills(npc_template_id);
CREATE INDEX idx_npc_template_skills_campaign ON public.npc_template_skills(campaign_id);

-- Extend combat_participants for NPCs
ALTER TABLE public.combat_participants
  ADD COLUMN IF NOT EXISTS npc_template_id uuid,
  ADD COLUMN IF NOT EXISTS npc_disposition text;

-- Extend combat_enemy_skills to support NPC-sourced skills
ALTER TABLE public.combat_enemy_skills
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'enemy',
  ADD COLUMN IF NOT EXISTS npc_template_id uuid;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.npc_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.npc_template_skills;
