-- Create reward_assignments table for real-time delivery
CREATE TABLE public.reward_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    sack_id UUID REFERENCES public.reward_sacks(id) ON DELETE SET NULL,
    
    -- Final calculated loot
    coins INTEGER NOT NULL DEFAULT 0,
    item_ids UUID[] DEFAULT '{}',
    skill_ids UUID[] DEFAULT '{}',
    booster_ids UUID[] DEFAULT '{}',
    
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_reward_assignments_character_id ON public.reward_assignments(character_id);
CREATE INDEX idx_reward_assignments_campaign_id ON public.reward_assignments(campaign_id);
CREATE INDEX idx_reward_assignments_status ON public.reward_assignments(status);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_assignments TO authenticated;
GRANT ALL ON public.reward_assignments TO service_role;

-- Enable RLS
ALTER TABLE public.reward_assignments ENABLE ROW LEVEL SECURITY;

-- Simplified Policy
CREATE POLICY "public_all_reward_assignments" ON public.reward_assignments FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_reward_assignments_updated_at
BEFORE UPDATE ON public.reward_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
