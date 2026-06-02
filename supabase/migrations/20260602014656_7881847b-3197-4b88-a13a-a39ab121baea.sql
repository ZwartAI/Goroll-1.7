-- Add author details to drawings
ALTER TABLE public.battle_map_drawings_simple 
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS author_color TEXT;

-- Ensure RLS is enabled
ALTER TABLE public.battle_map_drawings_simple ENABLE ROW LEVEL SECURITY;

-- Grant permissions (if not already granted, though usually they are)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_drawings_simple TO authenticated;
GRANT ALL ON public.battle_map_drawings_simple TO service_role;

-- Enable realtime for the drawings table if not already enabled
-- Note: This is done at the project level, but often adding it to the publication is required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'battle_map_drawings_simple'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_map_drawings_simple;
  END IF;
END $$;
