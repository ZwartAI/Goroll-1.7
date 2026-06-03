-- Final fix for battle_map_fog_simple permissions
ALTER TABLE public.battle_map_fog_simple DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.battle_map_fog_simple TO anon, authenticated, service_role;
ALTER TABLE public.battle_map_fog_simple ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for battle_map_fog_simple" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Fog elements are viewable by everyone" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Authenticated users can manage fog" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Anon users can manage fog" ON public.battle_map_fog_simple;

CREATE POLICY "Allow all access to fog"
ON public.battle_map_fog_simple
FOR ALL
USING (true)
WITH CHECK (true);
