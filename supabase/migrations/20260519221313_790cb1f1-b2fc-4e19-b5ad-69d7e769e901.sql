-- Lock down app_users (PIN credential leak)
DROP POLICY IF EXISTS public_all ON public.app_users;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Lock down login_attempts (rate-limit bypass)
DROP POLICY IF EXISTS public_all ON public.login_attempts;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Lock down deleted_campaigns (archive payload leak)
DROP POLICY IF EXISTS public_all ON public.deleted_campaigns;
ALTER TABLE public.deleted_campaigns ENABLE ROW LEVEL SECURITY;

-- app_settings: allow public read (background image), block public writes
DROP POLICY IF EXISTS public_all ON public.app_settings;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_public_read" ON public.app_settings
  FOR SELECT USING (true);

-- Remove from realtime publication (ignore errors if not present)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.app_users; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.login_attempts; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.deleted_campaigns; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;