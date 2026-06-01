-- Ensure tables are in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'battle_map_scenes_simple'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_scenes_simple;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'battle_map_tokens_simple'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_tokens_simple;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'battle_map_drawings_simple'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_drawings_simple;
  END IF;
END $$;
