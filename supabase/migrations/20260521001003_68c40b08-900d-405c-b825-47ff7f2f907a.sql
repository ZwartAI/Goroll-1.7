-- Phase 5: Combat skill uses + temporary effects

CREATE TABLE public.combat_skill_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  character_id uuid NOT NULL,
  character_skill_id uuid NOT NULL,
  rarity item_rarity NOT NULL,
  max_uses integer,
  uses_remaining integer,
  used_this_turn boolean NOT NULL DEFAULT false,
  last_turn_index integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, character_skill_id)
);

ALTER TABLE public.combat_skill_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON public.combat_skill_uses FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER combat_skill_uses_touch
BEFORE UPDATE ON public.combat_skill_uses
FOR EACH ROW EXECUTE FUNCTION public.enemy_templates_touch();

CREATE INDEX idx_combat_skill_uses_encounter ON public.combat_skill_uses (encounter_id);
CREATE INDEX idx_combat_skill_uses_character ON public.combat_skill_uses (encounter_id, character_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.combat_skill_uses;


CREATE TABLE public.combat_temporary_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  target_character_id uuid,
  target_enemy_participant_id uuid,
  source_character_id uuid,
  source_skill_id uuid,
  effect_type text NOT NULL DEFAULT 'shield',
  value integer NOT NULL DEFAULT 0,
  label text,
  duration_rounds integer,
  expires_at_turn_index integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.combat_temporary_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON public.combat_temporary_effects FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_combat_temporary_effects_encounter ON public.combat_temporary_effects (encounter_id);
CREATE INDEX idx_combat_temporary_effects_target_char ON public.combat_temporary_effects (target_character_id);
CREATE INDEX idx_combat_temporary_effects_target_enemy ON public.combat_temporary_effects (target_enemy_participant_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.combat_temporary_effects;