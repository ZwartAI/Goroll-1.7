-- 1) Revoke browser/anon access to credential & admin tables.
-- App-side reads/writes for these already go through server functions using
-- the service role (supabaseAdmin), so the browser does not need any grants.
REVOKE ALL ON public.app_users FROM anon, authenticated;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
REVOKE ALL ON public.deleted_campaigns FROM anon, authenticated;

GRANT ALL ON public.app_users TO service_role;
GRANT ALL ON public.login_attempts TO service_role;
GRANT ALL ON public.deleted_campaigns TO service_role;

-- Drop any permissive policies that may have been left around; service_role
-- bypasses RLS so no policies are needed for server-only tables.
DROP POLICY IF EXISTS "authenticated_full_access" ON public.app_users;
DROP POLICY IF EXISTS "Public read app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public manage app_users" ON public.app_users;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.login_attempts;
DROP POLICY IF EXISTS "Public read login_attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Public manage login_attempts" ON public.login_attempts;

DROP POLICY IF EXISTS "authenticated_full_access" ON public.deleted_campaigns;
DROP POLICY IF EXISTS "Public read deleted_campaigns" ON public.deleted_campaigns;
DROP POLICY IF EXISTS "Public manage deleted_campaigns" ON public.deleted_campaigns;

-- 2) Fog of war: the app uses its own login (no Supabase Auth), so the
-- existing policy keyed off auth.role()='authenticated' never matches and
-- writes silently fail. Replace it with a public_all policy so the DM and
-- players can sync fog. DM-only enforcement is handled in the UI.
DROP POLICY IF EXISTS "authenticated_full_access" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Authenticated users can manage fog" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Allow all access to fog" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Public read fog" ON public.battle_map_fog_simple;
DROP POLICY IF EXISTS "Public manage fog" ON public.battle_map_fog_simple;

CREATE POLICY "Public read fog"
  ON public.battle_map_fog_simple
  FOR SELECT
  USING (true);

CREATE POLICY "Public manage fog"
  ON public.battle_map_fog_simple
  FOR ALL
  USING (true)
  WITH CHECK (true);
