-- Drop existing policies
DROP POLICY IF EXISTS "DMs can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "Users can view scenes of campaigns they belong to" ON public.battle_map_scenes;

-- Create more robust management policy for DMs
CREATE POLICY "DMs can manage scenes"
ON public.battle_map_scenes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = battle_map_scenes.campaign_id 
    AND (campaigns.owner_user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_members.campaign_id = battle_map_scenes.campaign_id 
    AND campaign_members.user_id = auth.uid() 
    AND campaign_members.role = 'dm'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = battle_map_scenes.campaign_id 
    AND (campaigns.owner_user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_members.campaign_id = battle_map_scenes.campaign_id 
    AND campaign_members.user_id = auth.uid() 
    AND campaign_members.role = 'dm'
  )
);

-- Create view policy for members
CREATE POLICY "Users can view scenes of campaigns they belong to"
ON public.battle_map_scenes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_members.campaign_id = battle_map_scenes.campaign_id 
    AND campaign_members.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = battle_map_scenes.campaign_id 
    AND (campaigns.owner_user_id = auth.uid())
  )
);

-- Update default grid color to be more visible
ALTER TABLE public.battle_map_scenes 
ALTER COLUMN grid_color SET DEFAULT 'rgba(255,255,255,0.5)';

-- Ensure GRANTs are correct
GRANT ALL ON public.battle_map_scenes TO authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;
