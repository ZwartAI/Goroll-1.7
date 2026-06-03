
-- Restore broad grants and permissive RLS policies (this app uses a custom username/PIN auth via app_users, so requests come in as the anon role).

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

-- Recreate the permissive policies that were removed/narrowed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_full_access" ON public.%I', r.tablename);
    EXECUTE format('CREATE POLICY "public_full_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', r.tablename);
  END LOOP;
END $$;
