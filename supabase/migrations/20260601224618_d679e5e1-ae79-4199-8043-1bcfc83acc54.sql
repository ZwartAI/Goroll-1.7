ALTER TABLE public.battle_map_tokens_simple 
ADD COLUMN image_scale NUMERIC DEFAULT 1,
ADD COLUMN image_offset_x NUMERIC DEFAULT 50,
ADD COLUMN image_offset_y NUMERIC DEFAULT 50;
