ALTER TABLE public.enemy_templates
  ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_offset_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_offset_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_scale numeric NOT NULL DEFAULT 1;

ALTER TABLE public.combat_participants
  ADD COLUMN IF NOT EXISTS enemy_image_offset_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS enemy_image_offset_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS enemy_image_scale numeric NOT NULL DEFAULT 1;