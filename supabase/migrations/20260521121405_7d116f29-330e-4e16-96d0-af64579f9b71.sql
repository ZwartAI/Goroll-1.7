ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS image_rotation numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS body_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_image_offset_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS body_image_offset_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS body_image_scale numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS body_image_rotation numeric NOT NULL DEFAULT 0;

-- Backfill body image with face image for existing characters that have a face image
UPDATE public.characters
SET body_image_url = image_url
WHERE (body_image_url IS NULL OR body_image_url = '')
  AND image_url IS NOT NULL
  AND image_url <> '';