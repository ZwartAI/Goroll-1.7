ALTER TABLE public.battle_map_scenes_simple
ADD COLUMN IF NOT EXISTS weather_effect TEXT NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS weather_intensity TEXT NOT NULL DEFAULT 'medium';