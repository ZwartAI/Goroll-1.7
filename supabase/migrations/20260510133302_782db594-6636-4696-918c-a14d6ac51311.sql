
-- 1. Enable realtime on all gameplay tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boosters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.character_conditions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_members;

-- 2. Co-DM system
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS single_dm_only BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.dm_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  requester_user_id UUID NOT NULL,
  requester_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.dm_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.dm_join_requests FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_join_requests;

CREATE INDEX IF NOT EXISTS idx_dm_req_campaign_status ON public.dm_join_requests(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_dm_req_requester ON public.dm_join_requests(requester_user_id, status);
