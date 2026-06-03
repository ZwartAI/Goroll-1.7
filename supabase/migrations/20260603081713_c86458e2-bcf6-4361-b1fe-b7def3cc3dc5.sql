-- Fix permissions and policies for battle_map_fog_simple
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_fog_simple TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_fog_simple TO anon;
GRANT ALL ON public.battle_map_fog_simple TO service_role;

-- Revoke existing policies to avoid conflicts
DROP POLICY IF EXISTS "Fog elements are viewable by everyone" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Authenticated users can manage fog" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Public access for battle_map_fog_simple" ON public.battle_map_fog_simple;

-- Create more permissive policies
-- Reading fog is public (for players)
CREATE POLICY "Fog elements are viewable by everyone"
ON public.battle_map_fog_simple
FOR SELECT
USING (true);

-- Authenticated users (DM) can manage everything
CREATE POLICY "Authenticated users can manage fog"
ON public.battle_map_fog_simple
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also allow anon to manage for flexibility (sometimes needed in preview or guest modes)
CREATE POLICY "Anon users can manage fog"
ON public.battle_map_fog_simple
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
