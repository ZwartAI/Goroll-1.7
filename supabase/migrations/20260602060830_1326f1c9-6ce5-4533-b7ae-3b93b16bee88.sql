-- Set replica identity to FULL for all battle map tables to ensure DELETE events are correctly filtered in real-time
ALTER TABLE public.battle_map_drawings_simple REPLICA IDENTITY FULL;
ALTER TABLE public.battle_map_tokens_simple REPLICA IDENTITY FULL;
ALTER TABLE public.battle_map_scenes_simple REPLICA IDENTITY FULL;
