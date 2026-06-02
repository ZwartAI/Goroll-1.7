-- Create a table for Fog of War
CREATE TABLE public.battle_map_fog_simple (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL,
    scene_id UUID NOT NULL,
    fog_type TEXT NOT NULL DEFAULT 'brush', -- 'brush', 'rect', 'circle'
    shape TEXT NOT NULL DEFAULT 'circle',   -- for brush strokes, it's the tip shape
    color TEXT,
    opacity NUMERIC DEFAULT 0.85,
    brush_size NUMERIC DEFAULT 120,
    points JSONB NOT NULL,                   -- list of {x, y} coordinates for brush, or rect/circle bounds
    is_visible BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexing for performance
CREATE INDEX idx_battle_map_fog_scene ON public.battle_map_fog_simple(scene_id);
CREATE INDEX idx_battle_map_fog_campaign ON public.battle_map_fog_simple(campaign_id);

-- Enable RLS
ALTER TABLE public.battle_map_fog_simple ENABLE ROW LEVEL SECURITY;

-- Grant permissions (public access as requested)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_fog_simple TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_fog_simple TO authenticated;
GRANT ALL ON public.battle_map_fog_simple TO service_role;

-- Policies
CREATE POLICY "Public access for battle_map_fog_simple"
ON public.battle_map_fog_simple
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_fog_simple;

-- Function to update updated_at
CREATE TRIGGER update_battle_map_fog_updated_at
BEFORE UPDATE ON public.battle_map_fog_simple
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
