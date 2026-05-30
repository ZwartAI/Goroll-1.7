-- Drop existing restrictive policies for battle_map_scenes
DROP POLICY IF EXISTS "Campaign members can view scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "DMs and Owners can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "public can view battle map scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "public can insert battle map scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "public can update battle map scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "public can delete battle map scenes" ON public.battle_map_scenes;

-- Create new public policies for battle_map_scenes
ALTER TABLE public.battle_map_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on battle_map_scenes"
ON public.battle_map_scenes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on battle_map_scenes"
ON public.battle_map_scenes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update on battle_map_scenes"
ON public.battle_map_scenes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete on battle_map_scenes"
ON public.battle_map_scenes FOR DELETE
TO anon, authenticated
USING (true);

-- Ensure grants for battle_map_scenes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO anon, authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;

-- Check and fix battle_map_tokens
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'battle_map_tokens') THEN
        DROP POLICY IF EXISTS "public can view tokens" ON public.battle_map_tokens;
        DROP POLICY IF EXISTS "public can manage tokens" ON public.battle_map_tokens;
        
        ALTER TABLE public.battle_map_tokens ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow public select on battle_map_tokens" ON public.battle_map_tokens FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Allow public insert on battle_map_tokens" ON public.battle_map_tokens FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "Allow public update on battle_map_tokens" ON public.battle_map_tokens FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "Allow public delete on battle_map_tokens" ON public.battle_map_tokens FOR DELETE TO anon, authenticated USING (true);
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_tokens TO anon, authenticated;
    END IF;
END $$;

-- Check and fix battle_map_assets
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'battle_map_assets') THEN
        ALTER TABLE public.battle_map_assets ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow public select on battle_map_assets" ON public.battle_map_assets FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Allow public insert on battle_map_assets" ON public.battle_map_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "Allow public update on battle_map_assets" ON public.battle_map_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "Allow public delete on battle_map_assets" ON public.battle_map_assets FOR DELETE TO anon, authenticated USING (true);
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_assets TO anon, authenticated;
    END IF;
END $$;

-- Check and fix battle_map_drawings
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'battle_map_drawings') THEN
        ALTER TABLE public.battle_map_drawings ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow public select on battle_map_drawings" ON public.battle_map_drawings FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Allow public insert on battle_map_drawings" ON public.battle_map_drawings FOR INSERT TO anon, authenticated WITH CHECK (true);
        CREATE POLICY "Allow public update on battle_map_drawings" ON public.battle_map_drawings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
        CREATE POLICY "Allow public delete on battle_map_drawings" ON public.battle_map_drawings FOR DELETE TO anon, authenticated USING (true);
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_drawings TO anon, authenticated;
    END IF;
END $$;
