-- 1. Unique username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_unique_lower ON public.app_users (lower(username));

-- 2. Seed Master account
INSERT INTO public.app_users (username, pin)
SELECT 'MasterAcc1000', '1234'
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE lower(username) = 'masteracc1000');

-- 3. Login attempts (rate limiting)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  failed_count integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  next_try_at timestamptz,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ip)
);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.login_attempts FOR ALL USING (true) WITH CHECK (true);

-- 4. Global app settings (background, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.app_settings (key, value) VALUES ('background_url', '') ON CONFLICT (key) DO NOTHING;

-- 5. Backgrounds storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  CREATE POLICY "backgrounds_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'backgrounds');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "backgrounds_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backgrounds');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "backgrounds_public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'backgrounds');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "backgrounds_public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'backgrounds');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Condition effects catalog (global + per campaign)
CREATE TABLE IF NOT EXISTS public.condition_effects_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '✨',
  is_damage boolean NOT NULL DEFAULT false,
  damage_default integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.condition_effects_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.condition_effects_catalog FOR ALL USING (true) WITH CHECK (true);

-- Seed predefined catalog
INSERT INTO public.condition_effects_catalog (campaign_id, key, label, icon, is_damage, damage_default) VALUES
(NULL, 'envenenado',     'Envenenado',     '☠️', true, 2),
(NULL, 'paralizado',     'Paralizado',     '⚡', false, 0),
(NULL, 'quemado',        'Quemado',        '🔥', true, 3),
(NULL, 'dormido',        'Dormido',        '💤', false, 0),
(NULL, 'asustado',       'Asustado',       '😨', false, 0),
(NULL, 'aturdido',       'Aturdido',       '💫', false, 0),
(NULL, 'rabia',          'Con Rabia',      '😤', false, 0),
(NULL, 'furia',          'En Furia',       '😡', false, 0),
(NULL, 'inconsciente',   'Inconsciente',   '😵', false, 0),
(NULL, 'muerto',         'Muerto',         '💀', false, 0),
(NULL, 'ciego',          'Ciego',          '🙈', false, 0),
(NULL, 'invisible',      'Invisible',      '👻', false, 0),
(NULL, 'sangrando',      'Sangrando',      '🩸', true, 2),
(NULL, 'fracturado',     'Fracturado',     '🦴', true, 1),
(NULL, 'confundido',     'Confundido',     '😵‍💫', false, 0),
(NULL, 'ensordecido',    'Ensordecido',    '🙉', false, 0),
(NULL, 'realentizado',   'Realentizado',   '🐌', false, 0),
(NULL, 'debilitado',     'Debilitado',     '📉', false, 0),
(NULL, 'potenciado',     'Potenciado',     '📈', false, 0),
(NULL, 'herido',         'Herido',         '🤕', true, 1),
(NULL, 'mareado',        'Mareado',        '🌀', false, 0),
(NULL, 'deprimido',      'Deprimido',      '😞', false, 0),
(NULL, 'congelado',      'Congelado',      '🥶', false, 0),
(NULL, 'electrocutado',  'Electrocutado',  '⚡', false, 0),
(NULL, 'ahogado',        'Ahogado',        '🌊', true, 3),
(NULL, 'gula',           'Gula',           '🍖', false, 0),
(NULL, 'estrangulamiento','Estrangulamiento','🫨', true, 3)
ON CONFLICT DO NOTHING;

-- 7. Active conditions on characters
CREATE TABLE IF NOT EXISTS public.character_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.condition_effects_catalog(id) ON DELETE SET NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT '✨',
  turns_left integer NOT NULL DEFAULT 1,
  damage_per_turn integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.character_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.character_conditions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.character_conditions REPLICA IDENTITY FULL;

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.character_conditions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_effects_catalog;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;