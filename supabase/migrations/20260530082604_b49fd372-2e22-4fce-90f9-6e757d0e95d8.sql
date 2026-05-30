-- Drop existing policies for battle_map_scenes to recreate them cleanly
DROP POLICY IF EXISTS "DMs can manage scenes" ON public.battle_map_scenes;
DROP POLICY IF EXISTS "Users can view scenes of campaigns they belong to" ON public.battle_map_scenes;

-- Policy for viewing scenes (all members)
CREATE POLICY "Campaign members can view scenes" 
ON public.battle_map_scenes 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE public.campaigns.id = battle_map_scenes.campaign_id 
    AND (
      public.campaigns.owner_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.campaign_members 
        WHERE public.campaign_members.campaign_id = campaigns.id 
        AND public.campaign_members.user_id = auth.uid()
      )
    )
  )
);

-- Policy for managing scenes (DMs and Owners)
CREATE POLICY "DMs and Owners can manage scenes" 
ON public.battle_map_scenes 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE public.campaigns.id = battle_map_scenes.campaign_id 
    AND (
      public.campaigns.owner_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.campaign_members 
        WHERE public.campaign_members.campaign_id = campaigns.id 
        AND public.campaign_members.user_id = auth.uid() 
        AND public.campaign_members.role = 'dm'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE public.campaigns.id = battle_map_scenes.campaign_id 
    AND (
      public.campaigns.owner_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.campaign_members 
        WHERE public.campaign_members.campaign_id = campaigns.id 
        AND public.campaign_members.user_id = auth.uid() 
        AND public.campaign_members.role = 'dm'
      )
    )
  )
);

-- Grant permissions (standard procedure)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_map_scenes TO authenticated;
GRANT ALL ON public.battle_map_scenes TO service_role;
