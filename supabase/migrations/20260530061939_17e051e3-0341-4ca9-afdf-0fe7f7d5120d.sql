-- Eliminar políticas existentes para battle_map_scenes para evitar conflictos
DROP POLICY IF EXISTS "DMs can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "Users can view scenes of campaigns they belong to" ON public.battle_map_scenes;

-- Asegurar que los permisos básicos estén concedidos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;

-- Habilitar RLS (por si no lo estaba)
ALTER TABLE public.battle_map_scenes ENABLE ROW LEVEL SECURITY;

-- Política para que los DMs (dueños de la campaña o miembros con rol 'dm') puedan gestionar escenas
CREATE POLICY "DMs can manage scenes"
ON public.battle_map_scenes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE public.campaigns.id = battle_map_scenes.campaign_id
    AND public.campaigns.owner_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE public.campaign_members.campaign_id = battle_map_scenes.campaign_id
    AND public.campaign_members.user_id = auth.uid()
    AND public.campaign_members.role = 'dm'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE public.campaigns.id = battle_map_scenes.campaign_id
    AND public.campaigns.owner_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE public.campaign_members.campaign_id = battle_map_scenes.campaign_id
    AND public.campaign_members.user_id = auth.uid()
    AND public.campaign_members.role = 'dm'
  )
);

-- Política para que cualquier miembro de la campaña (incluyendo jugadores) pueda ver las escenas
CREATE POLICY "Users can view scenes of campaigns they belong to"
ON public.battle_map_scenes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE public.campaigns.id = battle_map_scenes.campaign_id
    AND public.campaigns.owner_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE public.campaign_members.campaign_id = battle_map_scenes.campaign_id
    AND public.campaign_members.user_id = auth.uid()
  )
);
