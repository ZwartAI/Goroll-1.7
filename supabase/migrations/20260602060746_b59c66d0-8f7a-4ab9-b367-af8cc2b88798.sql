-- Set replica identity to FULL for battle map tables to support realtime filters on DELETE
ALTER TABLE public.battle_map_drawings_simple REPLICA IDENTITY FULL;
ALTER TABLE public.battle_map_tokens_simple REPLICA IDENTITY FULL;
