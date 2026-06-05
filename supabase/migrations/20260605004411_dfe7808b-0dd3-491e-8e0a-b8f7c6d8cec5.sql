
CREATE TABLE public.battle_map_measurements_simple (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  scene_id UUID REFERENCES public.battle_map_scenes_simple(id) ON DELETE CASCADE,
  author_character_id UUID,
  author_name TEXT,
  author_color TEXT,
  mode TEXT NOT NULL DEFAULT 'line',
  start_x DOUBLE PRECISION NOT NULL,
  start_y DOUBLE PRECISION NOT NULL,
  end_x DOUBLE PRECISION NOT NULL,
  end_y DOUBLE PRECISION NOT NULL,
  distance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_measurements_simple TO anon, authenticated;
GRANT ALL ON public.battle_map_measurements_simple TO service_role;

ALTER TABLE public.battle_map_measurements_simple ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_full_access" ON public.battle_map_measurements_simple
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX battle_map_measurements_simple_scene_idx
  ON public.battle_map_measurements_simple (scene_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_measurements_simple;
