-- Add label and block_color to battle_map_fog_simple
ALTER TABLE public.battle_map_fog_simple 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS block_color TEXT;

-- Update RLS policies if needed (usually already covered by existing policies on the table)
-- But ensuring grants are correct
GRANT ALL ON public.battle_map_fog_simple TO authenticated;
GRANT ALL ON public.battle_map_fog_simple TO service_role;
GRANT SELECT ON public.battle_map_fog_simple TO anon;
