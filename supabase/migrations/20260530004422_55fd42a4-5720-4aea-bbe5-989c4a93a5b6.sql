-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a table for Battle Map Scenes
CREATE TABLE public.battle_map_scenes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Nueva Escena',
    background_url TEXT DEFAULT '',
    background_type TEXT DEFAULT 'image', -- 'image' or 'video'
    background_scale FLOAT DEFAULT 1.0,
    background_opacity FLOAT DEFAULT 1.0,
    background_brightness FLOAT DEFAULT 1.0,
    grid_size INTEGER DEFAULT 50,
    grid_color TEXT DEFAULT 'rgba(255,255,255,0.1)',
    grid_opacity FLOAT DEFAULT 0.5,
    show_grid BOOLEAN DEFAULT true,
    tokens_state JSONB DEFAULT '{}'::jsonb, -- Map of participant_id -> {x, y}
    chalk_lines JSONB DEFAULT '[]'::jsonb,
    chalk_notes JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_battle_map_scenes_campaign_id ON public.battle_map_scenes(campaign_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;

-- Enable RLS
ALTER TABLE public.battle_map_scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view scenes of campaigns they belong to" 
ON public.battle_map_scenes 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.campaign_members 
        WHERE campaign_id = battle_map_scenes.campaign_id 
        AND user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE id = battle_map_scenes.campaign_id 
        AND owner_user_id = auth.uid()
    )
);

CREATE POLICY "DMs can manage scenes" 
ON public.battle_map_scenes 
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.campaigns 
        WHERE id = battle_map_scenes.campaign_id 
        AND owner_user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_battle_map_scenes_updated_at
BEFORE UPDATE ON public.battle_map_scenes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
