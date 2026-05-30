-- Add explicit documentation via comments on the policies
COMMENT ON POLICY "Allow public select on battle_map_scenes" ON public.battle_map_scenes IS 'GoRoll custom auth: public read access for campaign participants via anon key.';
COMMENT ON POLICY "Allow public insert on battle_map_scenes" ON public.battle_map_scenes IS 'GoRoll custom auth: public write access for campaign participants via anon key.';
COMMENT ON POLICY "Allow public update on battle_map_scenes" ON public.battle_map_scenes IS 'GoRoll custom auth: public update access for campaign participants via anon key.';
COMMENT ON POLICY "Allow public delete on battle_map_scenes" ON public.battle_map_scenes IS 'GoRoll custom auth: public delete access for campaign participants via anon key.';

-- Ensure the table is correctly configured for public access
ALTER TABLE public.battle_map_scenes FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO anon, authenticated;
