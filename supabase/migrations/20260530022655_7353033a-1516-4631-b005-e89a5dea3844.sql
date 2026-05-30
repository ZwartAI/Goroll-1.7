-- Create reward_sacks table
CREATE TABLE public.reward_sacks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'special', 'legendary'
    has_coins BOOLEAN NOT NULL DEFAULT false,
    coins_min INTEGER NOT NULL DEFAULT 0,
    coins_max INTEGER NOT NULL DEFAULT 0,
    has_items BOOLEAN NOT NULL DEFAULT false,
    has_boosters BOOLEAN NOT NULL DEFAULT false,
    has_special_items BOOLEAN NOT NULL DEFAULT false,
    random_balanced BOOLEAN NOT NULL DEFAULT false,
    manual_item_ids UUID[] DEFAULT '{}',
    manual_skill_ids UUID[] DEFAULT '{}',
    manual_booster_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_reward_sacks_campaign_id ON public.reward_sacks(campaign_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_sacks TO authenticated;
GRANT ALL ON public.reward_sacks TO service_role;

-- Enable RLS
ALTER TABLE public.reward_sacks ENABLE ROW LEVEL SECURITY;

-- Simplified Policy (Following public_all pattern used in other tables)
CREATE POLICY "public_all_reward_sacks" ON public.reward_sacks FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at if it doesn't exist (it usually does but for safety)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_reward_sacks_updated_at
BEFORE UPDATE ON public.reward_sacks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
