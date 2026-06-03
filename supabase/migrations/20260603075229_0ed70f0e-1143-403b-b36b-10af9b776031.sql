-- Create a table for Fog of War elements
CREATE TABLE public.battle_map_fog_simple (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  scene_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brush', 'polygon')),
  points NUMERIC[] NOT NULL,
  is_eraser BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_fog_simple TO authenticated;
GRANT ALL ON public.battle_map_fog_simple TO service_role;

-- Enable Row Level Security
ALTER TABLE public.battle_map_fog_simple ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Fog elements are viewable by everyone"
ON public.battle_map_fog_simple
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage fog"
ON public.battle_map_fog_simple
FOR ALL
USING (auth.role() = 'authenticated');

-- Create an index for better performance when fetching fog for a scene
CREATE INDEX idx_battle_map_fog_scene ON public.battle_map_fog_simple (scene_id);