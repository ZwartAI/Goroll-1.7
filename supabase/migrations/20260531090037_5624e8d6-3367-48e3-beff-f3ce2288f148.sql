-- Fix RLS for battle_map_scenes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO anon, authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;

ALTER TABLE public.battle_map_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view scenes of campaigns they belong to" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "DMs can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "Campaign members can view scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "DMs and Owners can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS public_all ON public.battle_map_scenes;

CREATE POLICY public_all
ON public.battle_map_scenes
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure battle_map_scenes is in realtime
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
END $$;

-- Create storage bucket for battle maps if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('battle-maps', 'battle-maps', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for battle-maps
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'battle-maps');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'battle-maps');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'battle-maps');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'battle-maps');
