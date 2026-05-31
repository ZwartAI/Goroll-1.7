-- BLOQUE 1: Corregir battle_map_scenes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO anon, authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;

-- Eliminar policies restrictivas
DROP POLICY IF EXISTS "Users can view scenes of campaigns they belong to" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "DMs can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "Campaign members can view scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "DMs and Owners can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "public_all" ON public.battle_map_scenes;

-- Crear policy compatible
CREATE POLICY public_all ON public.battle_map_scenes
FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE public.battle_map_scenes ENABLE ROW LEVEL SECURITY;

-- BLOQUE 2: Verificar otras tablas relacionadas (si existen)
DO $$
BEGIN
    -- battle_map_tokens
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'battle_map_tokens') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_tokens TO anon, authenticated;
        GRANT ALL ON public.battle_map_tokens TO service_role;
        DROP POLICY IF EXISTS "public_all" ON public.battle_map_tokens;
        CREATE POLICY public_all ON public.battle_map_tokens FOR ALL USING (true) WITH CHECK (true);
        ALTER TABLE public.battle_map_tokens ENABLE ROW LEVEL SECURITY;
    END IF;

    -- battle_map_drawings
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'battle_map_drawings') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_drawings TO anon, authenticated;
        GRANT ALL ON public.battle_map_drawings TO service_role;
        DROP POLICY IF EXISTS "public_all" ON public.battle_map_drawings;
        CREATE POLICY public_all ON public.battle_map_drawings FOR ALL USING (true) WITH CHECK (true);
        ALTER TABLE public.battle_map_drawings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- BLOQUE 5: Añadir a realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'battle_map_scenes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_scenes;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar si falla por permisos o ya existe
END $$;
