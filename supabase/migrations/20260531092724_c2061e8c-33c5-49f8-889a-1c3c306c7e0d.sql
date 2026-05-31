-- Tablas para el nuevo Battle Map Simple

-- 1. Escenas
CREATE TABLE IF NOT EXISTS public.battle_map_scenes_simple (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT 'Nueva Escena',
    is_active BOOLEAN DEFAULT false,
    background_url TEXT,
    background_x NUMERIC DEFAULT 0,
    background_y NUMERIC DEFAULT 0,
    background_scale NUMERIC DEFAULT 1,
    background_opacity NUMERIC DEFAULT 1,
    grid_enabled BOOLEAN DEFAULT true,
    grid_size INTEGER DEFAULT 50,
    grid_color TEXT DEFAULT 'rgba(255,255,255,0.35)',
    grid_opacity NUMERIC DEFAULT 0.65,
    grid_offset_x NUMERIC DEFAULT 0,
    grid_offset_y NUMERIC DEFAULT 0,
    snap_to_grid BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tokens
CREATE TABLE IF NOT EXISTS public.battle_map_tokens_simple (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    scene_id UUID REFERENCES public.battle_map_scenes_simple(id) ON DELETE CASCADE,
    character_id UUID, -- Puede ser null para NPCs/Enemigos genéricos
    token_type TEXT DEFAULT 'player', -- 'player', 'enemy', 'npc'
    name TEXT, -- Para tokens sin character_id
    image_url TEXT,
    x NUMERIC NOT NULL DEFAULT 0,
    y NUMERIC NOT NULL DEFAULT 0,
    size NUMERIC DEFAULT 48,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Dibujos
CREATE TABLE IF NOT EXISTS public.battle_map_drawings_simple (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    scene_id UUID REFERENCES public.battle_map_scenes_simple(id) ON DELETE CASCADE,
    author_character_id UUID,
    color TEXT DEFAULT '#FFD700',
    stroke_width NUMERIC DEFAULT 3,
    points JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.battle_map_scenes_simple ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_map_tokens_simple ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_map_drawings_simple ENABLE ROW LEVEL SECURITY;

-- Permisos públicos (anon y authenticated) - Patrón simple de la app
GRANT ALL ON public.battle_map_scenes_simple TO anon, authenticated, service_role;
GRANT ALL ON public.battle_map_tokens_simple TO anon, authenticated, service_role;
GRANT ALL ON public.battle_map_drawings_simple TO anon, authenticated, service_role;

-- Políticas de acceso
CREATE POLICY "Public access to scenes" ON public.battle_map_scenes_simple FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to tokens" ON public.battle_map_tokens_simple FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to drawings" ON public.battle_map_drawings_simple FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_scenes_updated_at BEFORE UPDATE ON public.battle_map_scenes_simple FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_tokens_updated_at BEFORE UPDATE ON public.battle_map_tokens_simple FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
